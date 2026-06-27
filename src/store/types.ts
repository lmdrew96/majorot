/* ============================================================================
 * THE MAJOROT — RunState shape (Build-spec §5–6)
 * The single persisted save. Zustand owns it; persist mirrors it to IndexedDB.
 * ========================================================================== */
import type {
  Suit,
  Element,
  Orientation,
  Effect,
  Ending,
  DrawnCard,
  Resolution,
} from "@/content/majorot-content";
import type { CardId } from "@/engine/deck";

export type Phase =
  | "title"
  | "founding"
  | "playing"
  | "combat"
  | "chapterTurn"
  | "ending";

/** Favored Magic — 4/3/2/1 spread across the four elements (The Founding). */
export type Stats = Record<Element, number>;

export interface Ally {
  id: string;
  name: string;
  /** Suit flavors the once-per-chapter boon (ALLY_BOON[suit]). */
  suit: Suit;
  boonUsed: boolean;
  /** Aid goes cold until reconciled (strainAlly). */
  strained: boolean;
}

export interface KitEntry {
  id: string;
  name: string;
  suit: Suit | "none";
  stays: boolean;
  use: string;
}

export interface ClaimedSpell {
  majorId: number;
  orientation: Orientation;
  /** Chapter in which it was claimed. */
  chapter: number;
}

/** A cost deferred to the next rest (e.g. Devil's Pact: −3 Self). */
export interface PendingDebt {
  id: string;
  label: string;
  self?: number;
  spark?: number;
}

export interface JournalEntry {
  id: string;
  chapter: number;
  cardLabel: string;
  route: Resolution["route"];
  prompt: string;
  playerText: string;
  effectsApplied: Effect[];
  orientation?: Orientation;
  /** Narrative markers (e.g. "rival", "warded"). */
  tags?: string[];
  ts: number;
}

/** In-progress ritual data while phase === "founding". */
export interface FoundingState {
  step: number;
  witchName: string;
  arcana: { majorId: number; orientation: Orientation } | null;
  birthright: { majorId: number; orientation: Orientation } | null;
  childhood: DrawnCard | null;
  currentLife: DrawnCard | null;
  stats: Stats;
}

export interface CombatState {
  enemyKey: string;
  enemyLabel: string;
  /** The threat's element — its card's suit. Drives matchup. */
  enemyElement: Element;
  enemyHp: number;
  enemyMaxHp: number;
  strike: number;
  round: number;
  /** Sub-phase within a round: your attack, then the threat's answer. */
  step: "attack" | "defend";
  /** The element you're channeling this cast (defaults to your strongest matchup). */
  channel: Element;
  /** The claimed Major whose base damage you're casting (null = an unfocused base). */
  spellMajorId: number | null;
  prompt: string;
  log: string[];
  lastBones: { roll: number; kind: "backfire" | "hit" | "surge"; damage: number } | null;
  lastEvade: { roll: number; connects: boolean } | null;
  /** A backfire leaves you open — the threat strikes freely (no evade). */
  pendingFreeHit: boolean;
  outcome: "ongoing" | "won" | "yielded" | "lost";
}

/** The card currently surfaced on the play table, pre-commit. */
export interface CurrentDraw {
  card: CardId;
  drawn: DrawnCard;
  resolution: Resolution;
}

export interface RunState {
  phase: Phase;
  witch: string;
  stats: Stats;
  self: number; // 0–22
  spark: number; // 0–7
  chapter: number;
  founding: FoundingState;
  claimed: ClaimedSpell[];
  allies: Ally[]; // cap 3
  kit: KitEntry[];
  deck: CardId[];
  /** Fool's Beginner's Luck — forces the next draw's orientation, once. */
  pendingOrientation: Orientation | null;
  pendingDebts: PendingDebt[];
  current: CurrentDraw | null;
  combat: CombatState | null;
  journal: JournalEntry[];
  ending: Ending | null;
}

/** The slice of state that effects can mutate. */
export interface EffectSlice {
  self: number;
  spark: number;
  allies: Ally[];
  kit: KitEntry[];
}

export const EMPTY_STATS: Stats = { fire: 0, water: 0, air: 0, earth: 0 };

export const FRESH_FOUNDING: FoundingState = {
  step: 0,
  witchName: "",
  arcana: null,
  birthright: null,
  childhood: null,
  currentLife: null,
  stats: { ...EMPTY_STATS },
};
