/* ============================================================================
 * THE MAJOROT — Card Keywords (display layer)
 * ----------------------------------------------------------------------------
 * Three keywords per card per orientation, for the card face. These are a
 * DISTILLATION of Nae's authored oracle in majorot-content.ts (the situations,
 * spells, and reflections) — NOT standard tarot keywords — so the face always
 * agrees with the scene the card produces. The Courts have no per-card meaning
 * in the oracle, so theirs lean on traditional court archetypes.
 *
 * This file is display flavor only; nothing mechanical reads it. Edit freely.
 * ========================================================================== */
import type { Suit, PipRank, CourtRank, DrawnCard } from "./majorot-content";

export type Triple = readonly [string, string, string];
export interface CardKeywords {
  upright: Triple;
  reversed: Triple;
}

type MinorRank = PipRank | CourtRank;

/* ---------------------------------------------------------------------------
 * The 22 Majors — distilled from name + attack/effect + reflection.
 * ------------------------------------------------------------------------- */
export const MAJOR_KEYWORDS: Record<number, CardKeywords> = {
  0: { upright: ["leap", "beginnings", "abandon"], reversed: ["recklessness", "cold feet", "held back"] },
  1: { upright: ["will", "manifestation", "focus"], reversed: ["scattered power", "illusion", "untapped"] },
  2: { upright: ["intuition", "secrets", "inner voice"], reversed: ["ignored knowing", "withheld truth", "noise"] },
  3: { upright: ["nurture", "growth", "abundance"], reversed: ["smothering", "depletion", "neglect"] },
  4: { upright: ["order", "authority", "structure"], reversed: ["rigidity", "control", "faltering rule"] },
  5: { upright: ["tradition", "belief", "guidance"], reversed: ["dogma", "rebellion", "questioned faith"] },
  6: { upright: ["union", "choice", "devotion"], reversed: ["discord", "misalignment", "temptation"] },
  7: { upright: ["drive", "momentum", "resolve"], reversed: ["stalled", "scattered", "running away"] },
  8: { upright: ["courage", "gentleness", "mastery"], reversed: ["doubt", "raw force", "frayed nerves"] },
  9: { upright: ["solitude", "insight", "withdrawal"], reversed: ["isolation", "avoidance", "lost in the dark"] },
  10: { upright: ["turning luck", "fate", "change"], reversed: ["bad turn", "resistance", "stuck cycle"] },
  11: { upright: ["truth", "balance", "reckoning"], reversed: ["imbalance", "evasion", "unfairness"] },
  12: { upright: ["surrender", "new view", "the pause"], reversed: ["stalling", "resistance", "wasted limbo"] },
  13: { upright: ["endings", "release", "becoming"], reversed: ["clinging", "stagnation", "dread"] },
  14: { upright: ["balance", "blending", "patience"], reversed: ["excess", "discord", "imbalance"] },
  15: { upright: ["temptation", "bargain", "bondage"], reversed: ["breaking free", "the trap seen", "release"] },
  16: { upright: ["collapse", "upheaval", "revelation"], reversed: ["averted ruin", "clinging wreckage", "slow crack"] },
  17: { upright: ["hope", "renewal", "the small light"], reversed: ["doubt", "dimmed hope", "depletion"] },
  18: { upright: ["illusion", "fear", "the unclear"], reversed: ["clarity returns", "fear named", "fog lifting"] },
  19: { upright: ["joy", "clarity", "warmth"], reversed: ["dimmed light", "still hiding", "false cheer"] },
  20: { upright: ["the call", "awakening", "reckoning"], reversed: ["self-doubt", "ignored call", "regret"] },
  21: { upright: ["completion", "wholeness", "arrival"], reversed: ["unfinished", "so close", "loose ends"] },
};

/* ---------------------------------------------------------------------------
 * The 56 Minors — pips distilled from their upright/reversed situations;
 * courts from traditional archetypes (upright = ally, reversed = Reckoning).
 * ------------------------------------------------------------------------- */
export const MINOR_KEYWORDS: Record<Suit, Record<MinorRank, CardKeywords>> = {
  /* ---- WANDS — drive, fire, ambition ---- */
  wands: {
    A: { upright: ["spark", "inspiration", "ignition"], reversed: ["false start", "collapse", "ash"] },
    "2": { upright: ["planning", "the crossroads", "vision"], reversed: ["hesitation", "lost moment", "indecision"] },
    "3": { upright: ["expansion", "foresight", "returns"], reversed: ["setback", "delay", "flat returns"] },
    "4": { upright: ["foundation", "belonging", "footing"], reversed: ["shaken ground", "instability", "doubt"] },
    "5": { upright: ["rivalry", "friction", "sharpening"], reversed: ["strife", "the cutting word", "regret"] },
    "6": { upright: ["triumph", "recognition", "followers"], reversed: ["hollow win", "false praise", "doubt"] },
    "7": { upright: ["defiance", "the high ground", "standing firm"], reversed: ["outnumbered", "worn thin", "besieged"] },
    "8": { upright: ["momentum", "swift movement", "the rush"], reversed: ["overload", "dropped", "scattered"] },
    "9": { upright: ["resilience", "last stand", "grit"], reversed: ["exhaustion", "guard down", "depleted"] },
    "10": { upright: ["burden", "completion", "weariness"], reversed: ["the blaze crests", "breaking point", "overload"] },
    page: { upright: ["curiosity", "eager news", "the spark"], reversed: ["restlessness", "false start", "scattered"] },
    knight: { upright: ["daring", "adventure", "drive"], reversed: ["recklessness", "haste", "burnout"] },
    queen: { upright: ["confidence", "warmth", "magnetism"], reversed: ["domineering", "jealousy", "scorched"] },
    king: { upright: ["vision", "leadership", "boldness"], reversed: ["tyranny", "impulsiveness", "ego"] },
  },

  /* ---- CUPS — heart, bonds, emotion ---- */
  cups: {
    A: { upright: ["opening", "feeling", "overflow"], reversed: ["misplaced love", "the wrong vessel", "leakage"] },
    "2": { upright: ["connection", "the bond", "union"], reversed: ["rift", "discord", "breaking"] },
    "3": { upright: ["friendship", "belonging", "celebration"], reversed: ["exclusion", "left out", "on the outside"] },
    "4": { upright: ["rest", "stillness", "the exhale"], reversed: ["withdrawal", "missed reach", "apathy"] },
    "5": { upright: ["mourning", "acceptance", "carrying on"], reversed: ["regret", "fixation", "blind to plenty"] },
    "6": { upright: ["return", "nostalgia", "the gift"], reversed: ["stuck in the past", "the cage", "longing"] },
    "7": { upright: ["discernment", "clear seeing", "the true thing"], reversed: ["illusion", "the beautiful lie", "false hope"] },
    "8": { upright: ["walking away", "release", "the doorway"], reversed: ["staying too long", "outgrown", "excuses"] },
    "9": { upright: ["wish granted", "contentment", "enough"], reversed: ["hollow having", "emptiness", "anticlimax"] },
    "10": { upright: ["lasting joy", "fulfillment", "home"], reversed: ["the flood crests", "breaking point", "overwhelm"] },
    page: { upright: ["tenderness", "intuition", "a message"], reversed: ["moodiness", "naivety", "withdrawal"] },
    knight: { upright: ["romance", "idealism", "the gallant"], reversed: ["moodiness", "illusion", "false charm"] },
    queen: { upright: ["compassion", "empathy", "deep feeling"], reversed: ["martyrdom", "smothering", "drowning"] },
    king: { upright: ["calm", "kindness", "emotional mastery"], reversed: ["coldness", "manipulation", "repression"] },
  },

  /* ---- SWORDS — mind, truth, conflict, pain ---- */
  swords: {
    A: { upright: ["clarity", "truth", "the cut"], reversed: ["hard truth", "the blow", "reckoning"] },
    "2": { upright: ["decision", "clean choice", "resolve"], reversed: ["indecision", "stalemate", "paralysis"] },
    "3": { upright: ["grief faced", "release", "setting down"], reversed: ["heartbreak", "reopened wound", "sorrow"] },
    "4": { upright: ["rest", "stillness", "clarity"], reversed: ["dread", "sleeplessness", "the 3am mind"] },
    "5": { upright: ["cutting losses", "wisdom", "walking away"], reversed: ["right and alone", "hollow victory", "spite"] },
    "6": { upright: ["passage", "calmer water", "moving on"], reversed: ["carried weight", "unfinished", "baggage"] },
    "7": { upright: ["foresight", "the stolen glimpse", "cunning"], reversed: ["betrayal", "broken trust", "the turncoat"] },
    "8": { upright: ["release", "the key", "escape"], reversed: ["self-made cage", "fear", "trapped"] },
    "9": { upright: ["facing fear", "the dawn after", "shrinking dread"], reversed: ["anguish", "self-cruelty", "sleepless"] },
    "10": { upright: ["rock bottom", "release", "the first light"], reversed: ["the mind crests", "breaking point", "the edge"] },
    page: { upright: ["curiosity", "sharp wit", "vigilance"], reversed: ["gossip", "scattered thought", "deceit"] },
    knight: { upright: ["ambition", "directness", "drive"], reversed: ["aggression", "haste", "cruelty"] },
    queen: { upright: ["clarity", "wit", "honesty"], reversed: ["coldness", "cutting words", "judgment"] },
    king: { upright: ["intellect", "authority", "truth"], reversed: ["cold logic", "tyranny", "manipulation"] },
  },

  /* ---- PENTACLES — body, work, home, the material ---- */
  pentacles: {
    A: { upright: ["worth", "a gift", "the seed"], reversed: ["loss", "slipping away", "squandered"] },
    "2": { upright: ["balance", "juggling", "adaptability"], reversed: ["overwhelm", "dropped", "scattered"] },
    "3": { upright: ["craft", "recognition", "the open door"], reversed: ["cut corners", "redone", "sloppiness"] },
    "4": { upright: ["security", "holding", "keeping"], reversed: ["grasping", "greed", "the wound"] },
    "5": { upright: ["shelter", "rescue", "the lit door"], reversed: ["lack", "left in the cold", "watching"] },
    "6": { upright: ["generosity", "aid", "the open hand"], reversed: ["strings attached", "the hook", "debt"] },
    "7": { upright: ["patience", "slow harvest", "almost ripe"], reversed: ["barren yield", "wasted labor", "the empty field"] },
    "8": { upright: ["diligence", "craft", "mastery"], reversed: ["drudgery", "the grind", "no progress"] },
    "9": { upright: ["earned comfort", "the garden", "self-made ease"], reversed: ["lonely abundance", "the empty chair", "isolation"] },
    "10": { upright: ["legacy", "inheritance", "what outlasts"], reversed: ["the work crests", "breaking point", "upheaval"] },
    page: { upright: ["diligence", "ambition", "the apprentice"], reversed: ["laziness", "distraction", "missed chance"] },
    knight: { upright: ["reliability", "patience", "steady work"], reversed: ["stagnation", "dullness", "stubbornness"] },
    queen: { upright: ["nurture", "abundance", "practicality"], reversed: ["smothering", "self-neglect", "materialism"] },
    king: { upright: ["stability", "prosperity", "mastery"], reversed: ["greed", "rigidity", "control"] },
  },
};

/** The three keywords for a drawn card's face, in its orientation. */
export function cardKeywords(drawn: DrawnCard): Triple | readonly string[] {
  if (drawn.type === "major") {
    return MAJOR_KEYWORDS[drawn.majorId]?.[drawn.orientation] ?? [];
  }
  return MINOR_KEYWORDS[drawn.suit]?.[drawn.rank]?.[drawn.orientation] ?? [];
}
