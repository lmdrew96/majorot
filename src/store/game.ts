/* ============================================================================
 * THE MAJOROT — Game Store (Zustand + persist → IndexedDB)
 * ----------------------------------------------------------------------------
 * The single source of truth for a run. Persist mirrors every mutation to
 * IndexedDB (idb-keyval) under one save slot, so a reload resumes mid-run.
 * Actions orchestrate the pure engines (deck, effects) + content's resolveDraw.
 * ========================================================================== */
import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";

import type { DrawnCard, Effect, Element, Suit } from "@/content/majorot-content";
import { resolveDraw, endingFor, DECK, SUIT_ELEMENT, MAJORS } from "@/content/majorot-content";
import { buildPlayDeck, drawCard, foundingDraw, cardLabel } from "@/engine/deck";
import {
  rollD6,
  bonesKind,
  bonesDamage,
  evadeSlips,
  attackPreview,
} from "@/engine/combat";
import {
  applyEffects,
  clampSelf,
  clampSpark,
  payWard,
  dropEffectAt,
  addAlly,
  type WardPayment,
} from "@/engine/effects";
import { newId } from "@/lib/id";
import {
  FRESH_FOUNDING,
  EMPTY_STATS,
  type Ally,
  type ClaimedSpell,
  type EffectSlice,
  type JournalEntry,
  type Phase,
  type RunState,
  type Stats,
} from "./types";

const SAVE_KEY = "majorot-save-v1";

/* ---------------------------------------------------------------------------
 * Fresh state — a function so every new run gets its own arrays/objects.
 * ------------------------------------------------------------------------- */
function freshState(): RunState {
  return {
    phase: "title",
    witch: "",
    stats: { ...EMPTY_STATS },
    self: 0,
    spark: 0,
    chapter: 0,
    founding: { ...FRESH_FOUNDING, stats: { ...EMPTY_STATS } },
    claimed: [],
    allies: [],
    kit: [],
    deck: [],
    pendingOrientation: null,
    pendingDebts: [],
    current: null,
    combat: null,
    journal: [],
    ending: null,
  };
}

/* ---------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */
const drawnSuit = (d: DrawnCard): Suit | undefined =>
  d.type === "major" ? undefined : d.suit;

type NewEntry = Omit<JournalEntry, "id" | "chapter" | "ts">;

function entryFrom(state: RunState, e: NewEntry): JournalEntry {
  return { id: newId(), chapter: state.chapter, ts: Date.now(), ...e };
}

function sliceOf(s: RunState): EffectSlice {
  return { self: s.self, spark: s.spark, allies: s.allies, kit: s.kit };
}

/* ---------------------------------------------------------------------------
 * Actions
 * ------------------------------------------------------------------------- */
export interface FoundingCommit {
  witchName: string;
  stats: Stats;
  /** Reflections written during the ritual (childhood, current-life, etc.). */
  entries: NewEntry[];
}

export interface SceneCommit {
  playerText: string;
  /** gainAlly name (when the scene grants one). */
  allyName?: string;
  /** strain/lose target id (when the player chose one). */
  allyTargetId?: string | null;
  /** Ward a wound: cancel one effect at this index, paying Spark/Charm. */
  ward?: { dropIndex: number; with?: WardPayment } | null;
}

interface Actions {
  newRun: () => void;
  rollFounding: () => void;
  commitFounding: (payload: FoundingCommit) => void;

  draw: () => void;
  commitScene: (payload: SceneCommit) => void;
  commitAlly: (payload: { name: string; playerText: string }) => void;
  commitClaim: (payload: { playerText: string }) => void;

  combatSetChannel: (channel: Element) => void;
  combatSetSpell: (spellMajorId: number | null) => void;
  combatCastBones: () => void;
  combatEvade: () => void;
  combatYield: () => void;
  combatRecord: (playerText: string) => void;

  rest: () => void;

  /** Drop everything and return to a blank title (the New-game wipe). */
  reset: () => void;
}

export type GameStore = RunState & Actions;

/* ---------------------------------------------------------------------------
 * IndexedDB storage adapter for persist (createJSONStorage handles ser/de).
 * ------------------------------------------------------------------------- */
const idbStorage: StateStorage = {
  getItem: async (name) => (await idbGet(name)) ?? null,
  setItem: async (name, value) => {
    await idbSet(name, value);
  },
  removeItem: async (name) => {
    await idbDel(name);
  },
};

/* ---------------------------------------------------------------------------
 * Store
 * ------------------------------------------------------------------------- */
export const useGame = create<GameStore>()(
  persist(
    (set, get) => ({
      ...freshState(),

      newRun: () =>
        set({
          ...freshState(),
          phase: "founding",
          founding: { ...FRESH_FOUNDING, stats: { fire: 4, water: 3, air: 2, earth: 1 } },
        }),

      reset: () => set(freshState()),

      rollFounding: () => {
        const f = foundingDraw();
        set((s) => ({
          founding: {
            ...s.founding,
            arcana: f.arcana,
            birthright: f.birthright,
            childhood: f.childhood,
            currentLife: f.currentLife,
          },
        }));
      },

      commitFounding: ({ witchName, stats, entries }) =>
        set((s) => {
          const f = s.founding;
          if (!f.arcana || !f.birthright) return {};
          const removed = [f.arcana.majorId, f.birthright.majorId];
          const deck = buildPlayDeck(removed);
          const claimed: ClaimedSpell[] = [
            { majorId: f.arcana.majorId, orientation: f.arcana.orientation, chapter: 1 },
            { majorId: f.birthright.majorId, orientation: f.birthright.orientation, chapter: 1 },
          ];
          const journal = entries.map((e) =>
            entryFrom({ ...s, chapter: 1 }, e),
          );
          return {
            phase: "playing",
            witch: witchName.trim() || "The Witch",
            stats,
            self: DECK.startSelf,
            spark: DECK.startSpark,
            chapter: 1,
            deck,
            claimed,
            journal,
            founding: { ...FRESH_FOUNDING, stats: { ...EMPTY_STATS } },
          };
        }),

      draw: () => {
        const s = get();
        if (s.deck.length === 0 || s.current) return;
        const { drawn, card, deck } = drawCard(s.deck, {
          forcedOrientation: s.pendingOrientation,
        });
        const resolution = resolveDraw(drawn);

        if (resolution.route === "fight") {
          // INVARIANT: combat is only ever reached on the "fight" route, which
          // resolveDraw returns ONLY for reversed Courts (a Reckoning) and
          // reversed Tens (a Cresting). Upright Courts route to "ally" — never
          // here. The threat's element is its card's suit.
          const enemySuit: Suit = drawn.type === "major" ? "wands" : drawn.suit;
          const enemyElement = SUIT_ELEMENT[enemySuit];
          set({
            deck,
            pendingOrientation: null,
            current: { card, drawn, resolution },
            phase: "combat",
            combat: {
              enemyKey: resolution.enemy.key,
              enemyLabel: resolution.enemy.label,
              enemyElement,
              enemyHp: resolution.enemy.hp,
              enemyMaxHp: resolution.enemy.hp,
              strike: resolution.enemy.strike,
              round: 1,
              step: "attack",
              channel: topElement(s.stats),
              spellMajorId: bestSpellId(s.claimed),
              prompt: resolution.prompt,
              log: [
                `A ${resolution.enemy.label} rises — element ${enemyElement}, Strike ${resolution.enemy.strike}.`,
              ],
              lastBones: null,
              lastEvade: null,
              pendingFreeHit: false,
              outcome: "ongoing",
            },
          });
        } else {
          set({ deck, pendingOrientation: null, current: { card, drawn, resolution } });
        }
      },

      commitScene: ({ playerText, allyName, allyTargetId, ward }) =>
        set((s) => {
          if (!s.current || s.current.resolution.route !== "scene") return {};
          const res = s.current.resolution;
          let slice = sliceOf(s);
          let effects: readonly Effect[] = res.effects;
          const tags: string[] = [];

          if (ward && res.wound) {
            const paid = payWard(slice, ward.with);
            if (paid) {
              slice = paid.slice;
              effects = dropEffectAt(effects, ward.dropIndex);
              tags.push("warded", `ward:${paid.paidWith}`);
            }
          }

          const result = applyEffects(slice, effects, {
            allyName,
            allySuit: drawnSuit(s.current.drawn),
            allyTargetId: allyTargetId ?? null,
          });

          const entry = entryFrom(s, {
            cardLabel: cardLabel(s.current.drawn),
            route: "scene",
            prompt: res.prompt,
            playerText,
            orientation: s.current.drawn.orientation,
            effectsApplied: [...effects],
            tags: [...tags, ...result.tags],
          });

          const ruin = result.ruin;
          return {
            self: result.slice.self,
            spark: result.slice.spark,
            allies: result.slice.allies,
            kit: result.slice.kit,
            journal: [...s.journal, entry],
            current: null,
            ...(ruin
              ? { ending: endingFor(result.slice.self, s.claimed.length), phase: "ending" as Phase }
              : {}),
          };
        }),

      commitAlly: ({ name, playerText }) =>
        set((s) => {
          if (!s.current || s.current.resolution.route !== "ally") return {};
          const res = s.current.resolution;
          const candidate: Ally = {
            id: newId(),
            name: name.trim() || "A new ally",
            suit: res.suit,
            boonUsed: false,
            strained: false,
          };
          const { allies, added } = addAlly(s.allies, candidate);
          const entry = entryFrom(s, {
            cardLabel: cardLabel(s.current.drawn),
            route: "ally",
            prompt: res.prompt,
            playerText,
            orientation: s.current.drawn.orientation,
            effectsApplied: [],
            tags: added ? ["ally"] : ["ally", "circle-full"],
          });
          return { allies, journal: [...s.journal, entry], current: null };
        }),

      commitClaim: ({ playerText }) =>
        set((s) => {
          if (!s.current || s.current.resolution.route !== "claimSpell") return {};
          const res = s.current.resolution;
          const claimed = [
            ...s.claimed,
            { majorId: res.major.id, orientation: res.orientation, chapter: s.chapter },
          ];
          const entry = entryFrom(s, {
            cardLabel: cardLabel(s.current.drawn),
            route: "claimSpell",
            prompt: res.reflection,
            playerText,
            orientation: res.orientation,
            effectsApplied: [],
            tags: [`spell:${res.major.name}`],
          });

          // Total spells = founding 2 + claimed-in-play. The 22nd ends the game.
          if (claimed.length >= 22) {
            return {
              claimed,
              journal: [...s.journal, entry],
              current: null,
              ending: endingFor(s.self, claimed.length),
              phase: "ending" as Phase,
            };
          }
          // Claiming a Major turns the page → the chapter-close ceremony.
          return {
            claimed,
            journal: [...s.journal, entry],
            current: null,
            phase: "chapterTurn" as Phase,
          };
        }),

      combatSetChannel: (channel) =>
        set((s) => (s.combat ? { combat: { ...s.combat, channel } } : {})),

      combatSetSpell: (spellMajorId) =>
        set((s) => (s.combat ? { combat: { ...s.combat, spellMajorId } } : {})),

      combatCastBones: () =>
        set((s) => {
          const c = s.combat;
          if (!c || c.outcome !== "ongoing" || c.step !== "attack") return {};

          // Cast cost: 1 Spark, or 1 Self when Spark is empty.
          let spark = s.spark;
          let self = s.self;
          const log = [...c.log];
          if (spark > 0) {
            spark -= 1;
          } else {
            self = clampSelf(self - 1);
            log.push("No Spark left — the cast bites into Self (−1).");
          }

          const spellBase = c.spellMajorId != null ? MAJORS[c.spellMajorId].base : 2;
          const stat = s.stats[c.channel];
          const preview = attackPreview(spellBase, stat, c.channel, c.enemyElement);
          const roll = rollD6();
          const kind = bonesKind(roll);
          const dmg = bonesDamage(preview.damage, kind);
          const enemyHp = Math.max(0, c.enemyHp - dmg);
          log.push(
            `Cast the Bones — ${roll} (${kind}): ${dmg} damage. ${c.enemyLabel} at ${enemyHp}/${c.enemyMaxHp}.`,
          );

          const lastBones = { roll, kind, damage: dmg };

          // The cast itself could be lethal on empty Spark.
          if (self <= 0) {
            log.push("The working takes the last of you.");
            return { self, spark, combat: { ...c, enemyHp, log, lastBones, outcome: "lost" } };
          }
          if (enemyHp <= 0) {
            spark = clampSpark(spark + 1);
            log.push(`${c.enemyLabel} falls. +1 Spark.`);
            return { self, spark, combat: { ...c, enemyHp, log, lastBones, outcome: "won" } };
          }
          // The threat survives — it will answer.
          return {
            self,
            spark,
            combat: { ...c, enemyHp, log, lastBones, step: "defend", pendingFreeHit: kind === "backfire" },
          };
        }),

      combatEvade: () =>
        set((s) => {
          const c = s.combat;
          if (!c || c.outcome !== "ongoing" || c.step !== "defend") return {};
          const log = [...c.log];
          let self = s.self;
          let roll = 0;
          let connects: boolean;

          if (c.pendingFreeHit) {
            connects = true;
            log.push(`The backfire left you open — ${c.enemyLabel} strikes freely.`);
          } else {
            roll = rollD6();
            connects = !evadeSlips(roll);
            log.push(`Evade — ${roll}: ${connects ? "it connects" : "you slip it"}.`);
          }

          if (connects) {
            self = clampSelf(self - c.strike);
            log.push(`−${c.strike} Self.`);
          }
          const lastEvade = { roll, connects };

          if (self <= 0) {
            return { self, combat: { ...c, log, lastEvade, pendingFreeHit: false, outcome: "lost" } };
          }
          return {
            self,
            combat: {
              ...c,
              log,
              lastEvade,
              pendingFreeHit: false,
              round: c.round + 1,
              step: "attack",
            },
          };
        }),

      combatYield: () =>
        set((s) => {
          const c = s.combat;
          if (!c || c.outcome !== "ongoing") return {};
          const self = clampSelf(s.self - 1);
          const log = [...c.log, "You yield — a step back, −1 Self."];
          return { self, combat: { ...c, log, outcome: self <= 0 ? "lost" : "yielded" } };
        }),

      combatRecord: (playerText) =>
        set((s) => {
          const c = s.combat;
          if (!c || c.outcome === "ongoing" || !s.current) return {};
          const won = c.outcome === "won";
          const entry = entryFrom(s, {
            cardLabel: cardLabel(s.current.drawn),
            route: "fight",
            prompt: c.prompt,
            playerText,
            orientation: s.current.drawn.orientation,
            effectsApplied: won ? [{ kind: "spark", delta: 1 }] : [],
            tags: [c.outcome, c.enemyKey],
          });
          const ruin = c.outcome === "lost" || s.self <= 0;
          return {
            combat: null,
            current: null,
            journal: [...s.journal, entry],
            phase: ruin ? ("ending" as Phase) : ("playing" as Phase),
            ending: ruin ? endingFor(s.self, s.claimed.length) : s.ending,
          };
        }),

      rest: () =>
        set((s) => {
          let self = s.self;
          let spark: number = DECK.startSpark;
          for (const debt of s.pendingDebts) {
            if (debt.self) self = clampSelf(self + debt.self);
            if (debt.spark) spark = clampSpark(spark + debt.spark);
          }
          const allies = s.allies.map((a) => ({ ...a, boonUsed: false }));
          const ruin = self <= 0;
          return {
            self,
            spark,
            allies,
            pendingDebts: [],
            chapter: s.chapter + 1,
            phase: ruin ? ("ending" as Phase) : ("playing" as Phase),
            ending: ruin ? endingFor(self, s.claimed.length) : s.ending,
          };
        }),
    }),
    {
      name: SAVE_KEY,
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      // Persist run data only — actions are re-attached by the creator.
      partialize: (s): RunState => ({
        phase: s.phase,
        witch: s.witch,
        stats: s.stats,
        self: s.self,
        spark: s.spark,
        chapter: s.chapter,
        founding: s.founding,
        claimed: s.claimed,
        allies: s.allies,
        kit: s.kit,
        deck: s.deck,
        pendingOrientation: s.pendingOrientation,
        pendingDebts: s.pendingDebts,
        current: s.current,
        combat: s.combat,
        journal: s.journal,
        ending: s.ending,
      }),
    },
  ),
);

/** Element with the highest Favored Magic stat (combat's default channel). */
function topElement(stats: Stats): Element {
  const order = ["fire", "water", "air", "earth"] as const;
  return order.reduce((best, el) => (stats[el] > stats[best] ? el : best), order[0]);
}

/** The claimed Major with the highest base damage (combat's default spell). */
function bestSpellId(claimed: { majorId: number }[]): number | null {
  if (claimed.length === 0) return null;
  return claimed.reduce(
    (best, c) => (MAJORS[c.majorId].base > MAJORS[best].base ? c.majorId : best),
    claimed[0].majorId,
  );
}

/* ---------------------------------------------------------------------------
 * Hydration gate — IndexedDB is async, so the first paint may precede the
 * restored save. Components wait on this before deciding title vs. resume.
 * ------------------------------------------------------------------------- */
export function hasSavedRun(s: GameStore): boolean {
  return s.journal.length > 0 || s.claimed.length > 0 || s.phase !== "title";
}
