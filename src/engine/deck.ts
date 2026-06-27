/* ============================================================================
 * THE MAJOROT — Deck Engine (pure, unit-testable, zero UI deps)
 * ----------------------------------------------------------------------------
 * Build-spec §4 / ChaosPatch "Deck engine".
 * Models the deck as CardIds, builds the 76-card play deck, and draws cards
 * into the DrawnCard shape that content's resolveDraw() already consumes.
 *
 * A full tarot is 22 majors + 56 minors (14 ranks × 4 suits). Founding removes
 * 2 majors (kept as starting spells); all 56 minors stay. The play deck never
 * reshuffles. Since all 20 remaining majors live in the deck, the 22nd-Major
 * ending fires at/before exhaustion — but drawCard still guards an empty deck.
 * ========================================================================== */
import type {
  Suit,
  PipRank,
  CourtRank,
  Orientation,
  DrawnCard,
} from "@/content/majorot-content";
import { SUIT_ELEMENT, MAJORS } from "@/content/majorot-content";

/* ---------------------------------------------------------------------------
 * Card model
 * ------------------------------------------------------------------------- */
/** A minor's rank spans the 10 pips (A–10) plus the 4 courts. */
export type MinorRank = PipRank | CourtRank;

export type MinorCardId = { type: "minor"; suit: Suit; rank: MinorRank };
export type MajorCardId = { type: "major"; majorId: number };
export type CardId = MajorCardId | MinorCardId;

export const SUITS = Object.keys(SUIT_ELEMENT) as Suit[];
export const PIP_RANKS: PipRank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
export const COURT_RANKS: CourtRank[] = ["page", "knight", "queen", "king"];
export const MINOR_RANKS: MinorRank[] = [...PIP_RANKS, ...COURT_RANKS];
/** All 22 major ids, 0–21, in canonical order. */
export const MAJOR_IDS: number[] = MAJORS.map((m) => m.id);

const COURT_SET = new Set<MinorRank>(COURT_RANKS);
export function isCourtRank(rank: MinorRank): rank is CourtRank {
  return COURT_SET.has(rank);
}

/* ---------------------------------------------------------------------------
 * Randomness — Math.random by default; pass a seeded Rng for reproducibility.
 * ------------------------------------------------------------------------- */
export type Rng = () => number; // returns a float in [0, 1)

/** mulberry32 — a tiny, fast, deterministic PRNG for tests/replays. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates — returns a new array; never mutates the input. */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

/* ---------------------------------------------------------------------------
 * Deck construction
 * ------------------------------------------------------------------------- */
/** All 56 minors as CardIds (unshuffled, canonical order). */
export function allMinors(): MinorCardId[] {
  const out: MinorCardId[] = [];
  for (const suit of SUITS) {
    for (const rank of MINOR_RANKS) {
      out.push({ type: "minor", suit, rank });
    }
  }
  return out;
}

/**
 * Build the play deck: every major NOT removed at founding + all 56 minors,
 * shuffled exactly once. With 2 founding majors removed this is 20 + 56 = 76.
 */
export function buildPlayDeck(removedMajorIds: readonly number[], rng: Rng = Math.random): CardId[] {
  const removed = new Set(removedMajorIds);
  const majors: CardId[] = MAJOR_IDS.filter((id) => !removed.has(id)).map((majorId) => ({
    type: "major",
    majorId,
  }));
  return shuffle([...majors, ...allMinors()], rng);
}

/* ---------------------------------------------------------------------------
 * Drawing
 * ------------------------------------------------------------------------- */
export function rollOrientation(rng: Rng = Math.random, forced?: Orientation | null): Orientation {
  if (forced) return forced;
  return rng() < 0.5 ? "upright" : "reversed";
}

/** Map a CardId + orientation into the DrawnCard shape resolveDraw() expects. */
export function toDrawnCard(card: CardId, orientation: Orientation): DrawnCard {
  if (card.type === "major") {
    return { type: "major", majorId: card.majorId, orientation };
  }
  if (isCourtRank(card.rank)) {
    return { type: "court", suit: card.suit, rank: card.rank, orientation };
  }
  return { type: "pip", suit: card.suit, rank: card.rank, orientation };
}

export interface DrawResult {
  /** The resolved card to feed resolveDraw(). */
  drawn: DrawnCard;
  /** The raw CardId that left the deck (for record-keeping). */
  card: CardId;
  /** The deck after the draw (input deck is never mutated). */
  deck: CardId[];
}

export interface DrawOptions {
  rng?: Rng;
  /** Fool's "Beginner's Luck": force the next draw's orientation. */
  forcedOrientation?: Orientation | null;
}

/** Draw the top card (index 0). Throws on an empty deck — a defensive guard. */
export function drawCard(deck: readonly CardId[], opts: DrawOptions = {}): DrawResult {
  if (deck.length === 0) {
    throw new Error("drawCard: the play deck is empty");
  }
  const rng = opts.rng ?? Math.random;
  const [card, ...rest] = deck;
  const orientation = rollOrientation(rng, opts.forcedOrientation ?? null);
  return { drawn: toDrawnCard(card, orientation), card, deck: rest };
}

/* ---------------------------------------------------------------------------
 * The Founding (§12) — drawn before the play deck is built.
 *   Arcana + Birthright: random majors, kept as starting spells (removed).
 *   Childhood + Current Life: random minors, READ then RETURNED (not removed).
 * ------------------------------------------------------------------------- */
export interface FoundingDraw {
  /** [arcana, birthright] — the majors to remove from the play deck. */
  removedMajorIds: number[];
  arcana: { majorId: number; orientation: Orientation };
  birthright: { majorId: number; orientation: Orientation };
  childhood: DrawnCard;
  currentLife: DrawnCard;
}

export function foundingDraw(rng: Rng = Math.random): FoundingDraw {
  const majors = shuffle(MAJOR_IDS, rng);
  const arcanaId = majors[0];
  const birthrightId = majors[1];
  const minors = shuffle(allMinors(), rng);
  return {
    removedMajorIds: [arcanaId, birthrightId],
    arcana: { majorId: arcanaId, orientation: rollOrientation(rng) },
    birthright: { majorId: birthrightId, orientation: rollOrientation(rng) },
    childhood: toDrawnCard(minors[0], rollOrientation(rng)),
    currentLife: toDrawnCard(minors[1], rollOrientation(rng)),
  };
}

/* ---------------------------------------------------------------------------
 * Display labels (shared by the Card component + journal entries)
 * ------------------------------------------------------------------------- */
const SUIT_LABEL: Record<Suit, string> = {
  wands: "Wands",
  cups: "Cups",
  swords: "Swords",
  pentacles: "Pentacles",
};

const RANK_LABEL: Record<MinorRank, string> = {
  A: "Ace",
  "2": "Two",
  "3": "Three",
  "4": "Four",
  "5": "Five",
  "6": "Six",
  "7": "Seven",
  "8": "Eight",
  "9": "Nine",
  "10": "Ten",
  page: "Page",
  knight: "Knight",
  queen: "Queen",
  king: "King",
};

/** "II · The High Priestess" or "Three of Cups". Orientation is rendered by UI. */
export function cardLabel(card: DrawnCard): string {
  if (card.type === "major") {
    const m = MAJORS[card.majorId];
    return `${m.roman} · ${m.name}`;
  }
  return `${RANK_LABEL[card.rank]} of ${SUIT_LABEL[card.suit]}`;
}

/** Unicode suit glyph for the typographic card face. */
export const SUIT_GLYPH: Record<Suit, string> = {
  wands: "✺", // fire / drive
  cups: "❧", // water / heart
  swords: "†", // air / mind
  pentacles: "✦", // earth / body
};
