/* ============================================================================
 * THE MAJOROT — Effects Engine (Build-spec §6 / ChaosPatch "effects.ts")
 * ----------------------------------------------------------------------------
 * The mechanical vocabulary the loop auto-applies. Pure over an EffectSlice:
 * never mutates its input, returns a fresh slice + outcome. The store wires
 * these into actions; the UI gathers any player choices first (ally name,
 * strain/lose target, ward) and passes them as context.
 *
 * Ward (RULINGS): a reversed A–9 is a Wound. Spending 1 Spark or a Charm wards
 * it — cancelling exactly ONE effect of the PLAYER's choice (the Self-loss OR a
 * strain/lose rider). The picker only matters when a wound has >1 effect.
 * ========================================================================== */
import type { Effect, Suit } from "@/content/majorot-content";
import { KIT_ITEMS, RULINGS } from "@/content/majorot-content";
import type { Ally, EffectSlice, KitEntry } from "@/store/types";
import { newId } from "@/lib/id";

export const SELF_MIN = 0;
export const SELF_MAX = 22;
export const SPARK_MIN = 0;
export const SPARK_MAX = 7;
export const ALLY_CAP = 3;

export const clamp = (n: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, n));
export const clampSelf = (n: number): number => clamp(n, SELF_MIN, SELF_MAX);
export const clampSpark = (n: number): number => clamp(n, SPARK_MIN, SPARK_MAX);

/* ---------------------------------------------------------------------------
 * What the UI must collect before an Effect[] can be applied.
 * ------------------------------------------------------------------------- */
export interface EffectNeeds {
  /** A gainAlly is present and the circle has room — needs a name. */
  needsAllyName: boolean;
  /** strain/lose needs the player to pick among multiple candidates. */
  allyChoice: { op: "strain" | "lose"; candidates: Ally[] } | null;
}

export function effectNeeds(effects: readonly Effect[], allies: readonly Ally[]): EffectNeeds {
  const needsAllyName =
    effects.some((e) => e.kind === "gainAlly") && allies.length < ALLY_CAP;

  let allyChoice: EffectNeeds["allyChoice"] = null;
  const strain = effects.some((e) => e.kind === "strainAlly");
  const lose = effects.some((e) => e.kind === "loseAlly");
  if (strain) {
    const candidates = allies.filter((a) => !a.strained);
    if (candidates.length > 1) allyChoice = { op: "strain", candidates };
  } else if (lose) {
    if (allies.length > 1) allyChoice = { op: "lose", candidates: [...allies] };
  }
  return { needsAllyName, allyChoice };
}

/* ---------------------------------------------------------------------------
 * Applying effects
 * ------------------------------------------------------------------------- */
export interface EffectContext {
  /** Name for a gainAlly. */
  allyName?: string;
  /** Suit of the card granting the ally — flavors their boon. */
  allySuit?: Suit;
  /** Chosen target for strain/lose (defaults to the sole candidate). */
  allyTargetId?: string | null;
  makeId?: () => string;
}

export interface EffectResult {
  slice: EffectSlice;
  /** Self reached 0 — the run ends in Ruin. */
  ruin: boolean;
  /** Human-readable log lines describing what happened. */
  notes: string[];
  /** Journal tags raised (e.g. "rival", "peek:1"). */
  tags: string[];
}

function makeKitEntry(name: string, makeId: () => string): KitEntry | null {
  const item = KIT_ITEMS.find((k) => k.name === name);
  if (!item) return null;
  return { id: makeId(), name: item.name, suit: item.suit, stays: item.stays, use: item.use };
}

/**
 * Apply an Effect[] to a slice. Returns a new slice + outcome; input untouched.
 * Player-choice effects (gainAlly name, strain/lose target) read from `ctx`.
 */
export function applyEffects(
  slice: EffectSlice,
  effects: readonly Effect[],
  ctx: EffectContext = {},
): EffectResult {
  const makeId = ctx.makeId ?? newId;
  let self = slice.self;
  let spark = slice.spark;
  let allies = [...slice.allies];
  let kit = [...slice.kit];
  const notes: string[] = [];
  const tags: string[] = [];

  for (const effect of effects) {
    switch (effect.kind) {
      case "self": {
        self = clampSelf(self + effect.delta);
        notes.push(`${effect.delta >= 0 ? "+" : ""}${effect.delta} Self`);
        break;
      }
      case "spark": {
        spark = clampSpark(spark + effect.delta);
        notes.push(`${effect.delta >= 0 ? "+" : ""}${effect.delta} Spark`);
        break;
      }
      case "gainItem": {
        const entry = makeKitEntry(effect.item, makeId);
        if (entry) {
          kit = [...kit, entry];
          notes.push(`Gained ${entry.name}`);
        } else {
          notes.push(`Unknown item: ${effect.item}`);
        }
        break;
      }
      case "gainAlly": {
        if (allies.length >= ALLY_CAP) {
          notes.push(
            `Your circle is full (${ALLY_CAP}) — ${ctx.allyName ?? "the newcomer"} could not join.`,
          );
        } else {
          const ally: Ally = {
            id: makeId(),
            name: ctx.allyName?.trim() || "A new ally",
            suit: ctx.allySuit ?? "cups",
            boonUsed: false,
            strained: false,
          };
          allies = [...allies, ally];
          notes.push(`${ally.name} joins you.`);
        }
        break;
      }
      case "strainAlly": {
        const candidates = allies.filter((a) => !a.strained);
        const target =
          candidates.find((a) => a.id === ctx.allyTargetId) ?? candidates[0] ?? null;
        if (target) {
          allies = allies.map((a) => (a.id === target.id ? { ...a, strained: true } : a));
          notes.push(`${target.name}'s aid goes cold.`);
        } else {
          notes.push("No unstrained ally to strain.");
        }
        break;
      }
      case "loseAlly": {
        const target = allies.find((a) => a.id === ctx.allyTargetId) ?? allies[0] ?? null;
        if (target) {
          allies = allies.filter((a) => a.id !== target.id);
          notes.push(`${target.name} is lost to you.`);
        } else {
          notes.push("No ally to lose.");
        }
        break;
      }
      case "markRival": {
        tags.push("rival");
        notes.push("A rival is marked.");
        break;
      }
      case "peekTop": {
        // The reveal needs the deck; the store performs it. We only flag intent.
        tags.push(`peek:${effect.n}`);
        notes.push(`Peer at the top ${effect.n} of the deck.`);
        break;
      }
    }
  }

  return { slice: { self, spark, allies, kit }, ruin: self <= SELF_MIN, notes, tags };
}

/* ---------------------------------------------------------------------------
 * Allies
 * ------------------------------------------------------------------------- */
/** Append an ally, respecting the cap. When full, pass (decline). */
export function addAlly(allies: readonly Ally[], ally: Ally): { allies: Ally[]; added: boolean } {
  if (allies.length >= ALLY_CAP) return { allies: [...allies], added: false };
  return { allies: [...allies, ally], added: true };
}

/* ---------------------------------------------------------------------------
 * Ward (player-choice-of-one)
 * ------------------------------------------------------------------------- */
export function hasCharm(kit: readonly KitEntry[]): boolean {
  return kit.some((k) => k.name === "Charm");
}

export function canWard(slice: Pick<EffectSlice, "spark" | "kit">): boolean {
  return slice.spark > 0 || hasCharm(slice.kit);
}

export type WardPayment = "spark" | "charm";

/** Pay a ward's cost. Prefers Spark; falls back to a Charm. Pure. */
export function payWard(
  slice: EffectSlice,
  prefer: WardPayment = "spark",
): { slice: EffectSlice; paidWith: WardPayment } | null {
  const canSpark = slice.spark > 0;
  const charmAvailable = hasCharm(slice.kit);
  const useCharm = prefer === "charm" ? charmAvailable : !canSpark && charmAvailable;

  if (useCharm) {
    const idx = slice.kit.findIndex((k) => k.name === "Charm");
    if (idx === -1) return null;
    const kit = [...slice.kit.slice(0, idx), ...slice.kit.slice(idx + 1)];
    return { slice: { ...slice, kit }, paidWith: "charm" };
  }
  if (canSpark) {
    return { slice: { ...slice, spark: clampSpark(slice.spark - 1) }, paidWith: "spark" };
  }
  return null;
}

/** Drop one effect (the warded one) from a wound's Effect[]. */
export function dropEffectAt(effects: readonly Effect[], index: number): Effect[] {
  if (index < 0 || index >= effects.length) return [...effects];
  return [...effects.slice(0, index), ...effects.slice(index + 1)];
}

/** A ward cancels exactly RULINGS.wardCancelsCount effects (1). */
export const WARD_CANCELS = RULINGS.wardCancelsCount;
