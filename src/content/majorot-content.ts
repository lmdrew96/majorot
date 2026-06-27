/* ============================================================================
 * THE MAJOROT — Content / Oracle Data Module
 * ----------------------------------------------------------------------------
 * The single source of truth for the digital game's interpretation layer.
 * Every card the play-deck can produce maps to a resolution here.
 *
 * Provenance: transcribed faithfully from Nae's own design docs
 *   (The-Majorot--Playtest-Rules.pdf §3, §6, §10, Appendix B, C, D).
 * This is YOUR game text — it ships as-is.
 *
 * Authored vs draft:
 *   - Everything here is from the rules PDF EXCEPT the Upright 10 ("Cresting,
 *     fortunate") entries, which are NOT in Appendix B. Those are marked
 *     `authored: false` with a neutral placeholder for you to replace. See
 *     the CONTENT_GAPS audit at the bottom. Nothing else was invented.
 *
 * Consumption: pure data + types + one reference `resolveDraw()` at the end
 * that Cody can lift or replace. No runtime prose-parsing needed.
 * ========================================================================== */

/* ---------------------------------------------------------------------------
 * 1. PRIMITIVES
 * ------------------------------------------------------------------------- */
export type Suit = "wands" | "cups" | "swords" | "pentacles";
export type Element = "fire" | "water" | "air" | "earth";
export type Orientation = "upright" | "reversed";
export type PipRank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10";
export type CourtRank = "page" | "knight" | "queen" | "king";
export type Magnitude = "small" | "heavy";

/** Suit ⇄ element binding (The Read, §3). */
export const SUIT_ELEMENT: Record<Suit, Element> = {
  wands: "fire",
  cups: "water",
  swords: "air",
  pentacles: "earth",
};

export const ELEMENT_META: Record<Element, { suit: Suit; faculty: string }> = {
  fire: { suit: "wands", faculty: "Spirit" },
  water: { suit: "cups", faculty: "Emotion" },
  air: { suit: "swords", faculty: "Mind" },
  earth: { suit: "pentacles", faculty: "Body" },
};

/* ---------------------------------------------------------------------------
 * 2. THE WHEEL (matchup math, §5)
 *    Cycle: Water ▸ Fire ▸ Air ▸ Earth ▸ (Water). Each beats the next.
 * ------------------------------------------------------------------------- */
/** predator → prey. PREY[x] is the element x melts (2×). */
export const PREY: Record<Element, Element> = {
  water: "fire",
  fire: "air",
  air: "earth",
  earth: "water",
};

/** Channel `channel` against a defender of `target`. Returns the multiplier.
 *  2 = super-effective · 1 = neutral · 0.5 = mirror/weak · 0 = dead. */
export function matchup(channel: Element, target: Element): 0 | 0.5 | 1 | 2 {
  if (channel === target) return 0.5;
  if (PREY[channel] === target) return 2;
  if (PREY[target] === channel) return 0;
  return 1;
}

/** Damage = floor((spellBase + channeledStat) × matchup).
 *  Floor matches the rules' worked example: (4+1)×½ = 2. */
export function damage(base: number, stat: number, m: number): number {
  return Math.floor((base + stat) * m);
}

/* ---------------------------------------------------------------------------
 * 3. ENEMY TIERS (§6 — HP & Strike locked, tuned by simulation)
 * ------------------------------------------------------------------------- */
export interface EnemyTier {
  key: string;
  label: string;
  hp: number;
  strike: number;
}

/** Reversed Tens are a "Cresting"; reversed Courts are a "Reckoning". */
export const ENEMY_BY_RANK: Record<"10" | CourtRank, EnemyTier> = {
  "10": { key: "ten", label: "Cresting (Ten)", hp: 24, strike: 3 },
  page: { key: "page", label: "Reckoning (Page)", hp: 26, strike: 3 },
  knight: { key: "knight", label: "Reckoning (Knight)", hp: 28, strike: 4 },
  queen: { key: "queen", label: "Reckoning (Queen)", hp: 30, strike: 4 },
  king: { key: "king", label: "Reckoning (King)", hp: 32, strike: 5 },
};

/* ---------------------------------------------------------------------------
 * 4. EFFECTS (the mechanical vocabulary the loop auto-applies)
 *    Narrative-only beats carry no Effect — the prompt IS the effect.
 * ------------------------------------------------------------------------- */
export type Effect =
  | { kind: "self"; delta: number } // ± Self
  | { kind: "spark"; delta: number } // ± Spark
  | { kind: "gainItem"; item: string } // add named Kit item
  | { kind: "gainAlly" } // +1 ally (player names them)
  | { kind: "strainAlly" } // an ally's aid goes cold until reconciled
  | { kind: "loseAlly" } // permanent
  | { kind: "markRival" } // narrative marker
  | { kind: "peekTop"; n: number }; // look at top N of the deck

/* ---------------------------------------------------------------------------
 * 5. ALLY BOONS (§9 — once per chapter, flavored by suit)
 * ------------------------------------------------------------------------- */
export const ALLY_BOON: Record<Suit, { label: string; effect: string }> = {
  wands: { label: "Attack", effect: "+2 to a cast" },
  cups: { label: "Heart", effect: "absorb 1 Self" },
  pentacles: { label: "Fortune", effect: "+2 Spark" },
  swords: { label: "Counsel", effect: "a redraw" },
};

/* ---------------------------------------------------------------------------
 * 6. THE KIT (Appendix C — items & charms)
 * ------------------------------------------------------------------------- */
export interface KitItem {
  name: string;
  suit: Suit | "none";
  stays: boolean; // true = persists in Kit; false = spent once then gone
  use: string;
}

export const KIT_ITEMS: KitItem[] = [
  { name: "The First Ember", suit: "wands", stays: false, use: "+3 to any one attack." },
  { name: "The Far-Seeing Glass", suit: "wands", stays: false, use: "Look at the top 3 cards; reorder or leave them." },
  { name: "The Swift Arrows", suit: "wands", stays: false, use: "In a fight, strike twice this round before the threat acts." },
  { name: "The Welling Cup", suit: "cups", stays: true, use: "Once per chapter, restore 2 Self." },
  { name: "The Dreaming Chalice", suit: "cups", stays: false, use: "Look at the next 2 cards, choose which to face; the other reshuffles." },
  { name: "The Clear Blade", suit: "swords", stays: false, use: "Your next attack ignores matchup (no ½, no 0)." },
  { name: "The Balance Key", suit: "swords", stays: false, use: "Yield a fight at no Self cost — a clean exit." },
  { name: "The Ferryman's Token", suit: "swords", stays: false, use: "Skip the next threat entirely — no fight, no cost." },
  { name: "The Thief's Spyglass", suit: "swords", stays: false, use: "Look at the top 5; take one into hand, reshuffle the rest." },
  { name: "The Loosing Key", suit: "swords", stays: false, use: "End a fight, OR clear a Wound, OR break any bind." },
  { name: "The Seed-Pearl", suit: "pentacles", stays: true, use: "While held, +1 Spark at the start of each chapter." },
  { name: "The Juggler's Coins", suit: "pentacles", stays: false, use: "Take an extra action this turn (cast twice, or cast and draw)." },
  { name: "The Mason's Mark", suit: "pentacles", stays: false, use: "Turn any one Court you meet into an ally automatically." },
  { name: "The Open Hand", suit: "pentacles", stays: false, use: "Restore 2 Self and 1 Spark." },
  { name: "The Patient Vine", suit: "pentacles", stays: true, use: "Spend for +2 Self per chapter held (max +6)." },
  { name: "The Crafter's Awl", suit: "pentacles", stays: false, use: "Permanently raise one element stat by 1 (max 4)." },
  { name: "Charm", suit: "none", stays: false, use: "+2 to a cast, or ward a Wound." },
];

/* ---------------------------------------------------------------------------
 * 7. THE SPELLBOOK — 22 Majors (§10 + Appendix D reflections)
 * ------------------------------------------------------------------------- */
export interface MajorSpell {
  id: number; // 0–21
  roman: string;
  name: string;
  base: number;
  attack: { name: string; text: string };
  effect: { name: string; text: string };
  /** chapter-close reflection prompt (Appendix D) */
  reflection: string;
}

export const MAJORS: MajorSpell[] = [
  { id: 0, roman: "0", name: "The Fool", base: 3,
    attack: { name: "Leap", text: "Strike at +2 base, but take 1 Self." },
    effect: { name: "Beginner's Luck", text: "Choose the orientation of your next draw." },
    reflection: "You took a leap to get here. Write about what your character left behind to do it, and whether they wish they hadn't." },
  { id: 1, roman: "I", name: "The Magician", base: 4,
    attack: { name: "Bolt", text: "Clean damage — the baseline." },
    effect: { name: "Manifest", text: "Will one small thing into being; it's simply true." },
    reflection: "Your character made something real this chapter. Write about the one thing they most want to create — and what's stopping them from starting." },
  { id: 2, roman: "II", name: "The High Priestess", base: 3,
    attack: { name: "Hush", text: "Damage, and shrug off the next blow this fight." },
    effect: { name: "Scry", text: "Look at the top 3 cards; return them in any order." },
    reflection: "Your character knows something they haven't said out loud. Write what it is." },
  { id: 3, roman: "III", name: "The Empress", base: 4,
    attack: { name: "Bloom", text: "Damage; if it kills, restore 1 Self." },
    effect: { name: "Nurture", text: "Restore 3 Self (or 2 to an ally)." },
    reflection: "Your character is growing something — a plan, a bond, a new self. Write what it is, and what it costs them to keep it alive." },
  { id: 4, roman: "IV", name: "The Emperor", base: 5,
    attack: { name: "Dominion", text: "Damage; +2 vs Court threats." },
    effect: { name: "Decree", text: "Ward your next 2 Wounds free." },
    reflection: "Your character lives by a rule. Write what it is, and the moment they're afraid it might break." },
  { id: 5, roman: "V", name: "The Hierophant", base: 4,
    attack: { name: "Anathema", text: "Damage; a mirror (½) channel counts as full (×1)." },
    effect: { name: "Blessing", text: "Your next cast costs no Spark." },
    reflection: "Write a belief your character inherited from someone else, and whether they still believe it." },
  { id: 6, roman: "VI", name: "The Lovers", base: 3,
    attack: { name: "Bond's Edge", text: "Damage; +2 while protecting an ally." },
    effect: { name: "Union", text: "Turn a Court you've met into an ally (once each)." },
    reflection: "A relationship mattered this chapter. Write about the one person your character would give up the whole working for." },
  { id: 7, roman: "VII", name: "The Chariot", base: 5,
    attack: { name: "Charge", text: "Damage; +2 on your first cast of a fight." },
    effect: { name: "Seize", text: "Your fight-wins grant +2 Spark instead of +1." },
    reflection: "Your character won by refusing to quit. Write what they're chasing, and what they might be running from." },
  { id: 8, roman: "VIII", name: "Strength", base: 3,
    attack: { name: "Tame", text: "If the threat is at half HP or less, end the fight now (a win, no kill)." },
    effect: { name: "Endure", text: "Bear your next 3 Wounds free." },
    reflection: "Your character handled something powerful without breaking it. Write about a wild part of them they're learning to hold gently instead of lock away." },
  { id: 9, roman: "IX", name: "The Hermit", base: 3,
    attack: { name: "Lantern", text: "Damage; +2 if it's your only cast this fight." },
    effect: { name: "Withdraw", text: "Skip drawing this sitting to restore Spark to full. (your rest mechanic)" },
    reflection: "Your character found this by being alone and quiet. Write what they can see in the quiet that they miss in the noise." },
  { id: 10, roman: "X", name: "Wheel of Fortune", base: 4,
    attack: { name: "Spin", text: "Flip a card (return it): upright ×2, reversed ×0." },
    effect: { name: "Fortune's Favor", text: "Set aside the card you just drew and draw again." },
    reflection: "Luck turned this chapter, for better or worse. Write about something your character has stopped trying to control." },
  { id: 11, roman: "XI", name: "Justice", base: 4,
    attack: { name: "Reckoning", text: "Damage; +1 for every Self you're currently missing." },
    effect: { name: "Balance", text: "Convert between Self and Spark (2 Spark ↔ 1 Self)." },
    reflection: "A truth caught up with your character. Write the thing they've been avoiding, and what it costs to face it." },
  { id: 12, roman: "XII", name: "The Hanged Man", base: 2,
    attack: { name: "Suspend", text: "Low damage; the threat can't strike for 2 rounds." },
    effect: { name: "Surrender", text: "Flip any one card you've drawn this session." },
    reflection: "Your character stopped struggling and saw things a new way. Write what they understood only after they let go." },
  { id: 13, roman: "XIII", name: "Death", base: 7,
    attack: { name: "Reap", text: "Heavy damage; +4 vs a threat at half HP or less." },
    effect: { name: "Transmute", text: "Discard a card to reveal toward your next Major and take it. (once/chapter)" },
    reflection: "Something in your character had to end here. Write what they're letting go of, and who they become without it." },
  { id: 14, roman: "XIV", name: "Temperance", base: 3,
    attack: { name: "Alloy", text: "Damage; channel two elements, take the better matchup." },
    effect: { name: "Temper", text: "Restore 2 Self and 2 Spark." },
    reflection: "Your character found a balance. Write about two parts of them that shouldn't work together, but somehow do." },
  { id: 15, roman: "XV", name: "The Devil", base: 6,
    attack: { name: "Temptation", text: "+4 damage, but pay 2 Self." },
    effect: { name: "Pact", text: "Gain 3 Spark now; lose 3 Self at next chapter's start." },
    reflection: "Your character made a bargain for power. Write what they tied themselves to, and whether they see it's a trap." },
  { id: 16, roman: "XVI", name: "The Tower", base: 7,
    attack: { name: "Cataclysm", text: "Heavy damage; ignores matchup (even your opposite hits full)." },
    effect: { name: "Collapse", text: "Destroy an obstacle in your story outright; draw the cost." },
    reflection: "Something your character built fell apart. Write what they lost, and the truth they only saw once it was gone." },
  { id: 17, roman: "XVII", name: "The Star", base: 2,
    attack: { name: "Starfall", text: "Low damage; restore 2 Self." },
    effect: { name: "Renewal", text: "Restore 4 Self and flip one reversed card upright." },
    reflection: "After a hard stretch, a little hope. Write about the small thing keeping your character going." },
  { id: 18, roman: "XVIII", name: "The Moon", base: 3,
    attack: { name: "Phantasm", text: "Damage; the threat strikes itself next round." },
    effect: { name: "Obscure", text: "The next reversed Minor you draw isn't a threat." },
    reflection: "Not everything your character fears is real. Write about a fear they're carrying, and whether they can tell yet if it's real." },
  { id: 19, roman: "XIX", name: "The Sun", base: 6,
    attack: { name: "Radiance", text: "Damage; +2 while above half Self." },
    effect: { name: "Daybreak", text: "Restore 5 Self and flip all your reversed cards upright. (once/chapter)" },
    reflection: "Things feel lighter now. Write about the good that's come back into your character's life, and a part of them that's done hiding." },
  { id: 20, roman: "XX", name: "Judgement", base: 6,
    attack: { name: "Summons", text: "Damage; +1 for every Major-spell you've collected." },
    effect: { name: "Rise", text: "Restore a lost spell or ally, or un-take your last Wound." },
    reflection: "Your character heard a call and answered. Write what they feel called to become." },
  { id: 21, roman: "XXI", name: "The World", base: 5,
    attack: { name: "Encompass", text: "Damage; channel any element at ×1 (no dead matchups)." },
    effect: { name: "Completion", text: "Search the deck for any one Major and take it. (once/game)" },
    reflection: "Your character is more whole than when they started. Write about something they've made peace with, and what's still left to do." },
];

/* ---------------------------------------------------------------------------
 * 8. THE PIP ORACLE (Appendix B — all 36 pip cards A–9 × 4 suits)
 *    Each card has an upright + reversed entry. Magnitude A–5 small, 6–9 heavy.
 *    Reversed A–9 = a Wound: the Self-loss is wardable (1 Spark or a Charm).
 *    `situation` = the scene · `prompt` = what to write · `effects` = mechanics.
 * ------------------------------------------------------------------------- */
export interface PipEntry {
  situation: string;
  prompt: string;
  effects: Effect[];
}
export interface PipCard {
  magnitude: Magnitude;
  upright: PipEntry;
  reversed: PipEntry; // Wound when rank is A–9
}

type PipKey = Exclude<PipRank, "10">;

export const PIP_ORACLE: Record<Suit, Record<PipKey, PipCard>> = {
  /* ---------------- WANDS — drive, fire, ambition, conflict ------------- */
  wands: {
    A: { magnitude: "small",
      upright: { situation: "A wild idea seizes you, undeniable.", prompt: "Write the moment it caught.", effects: [{ kind: "gainItem", item: "The First Ember" }] },
      reversed: { situation: "A thing you loved collapses before it begins.", prompt: "Write the ash of it — what almost was.", effects: [{ kind: "spark", delta: -1 }] } },
    "2": { magnitude: "small",
      upright: { situation: "You stand at a crossroads, map in hand.", prompt: "Write the two futures you're choosing between.", effects: [{ kind: "gainItem", item: "The Far-Seeing Glass" }] },
      reversed: { situation: "You hesitate too long; the moment closes.", prompt: "Write what you didn't do, and why.", effects: [{ kind: "spark", delta: -1 }] } },
    "3": { magnitude: "small",
      upright: { situation: "What you set in motion returns tenfold.", prompt: "Write what you sent out into the world.", effects: [{ kind: "spark", delta: 1 }] },
      reversed: { situation: "Word comes back that your effort fell flat.", prompt: "Write the reply you dreaded getting.", effects: [{ kind: "spark", delta: -1 }] } },
    "4": { magnitude: "small",
      upright: { situation: "You reach a threshold that feels like footing.", prompt: "Describe the place. What makes it yours?", effects: [{ kind: "self", delta: 1 }] },
      reversed: { situation: "The ground you built on shifts.", prompt: "Write what you thought was solid.", effects: [{ kind: "self", delta: -1 }] } },
    "5": { magnitude: "small",
      upright: { situation: "A rival pushes you and you sharpen against them.", prompt: "Introduce the rival. What do they have that you want?", effects: [{ kind: "spark", delta: 1 }, { kind: "markRival" }] },
      reversed: { situation: "A needless quarrel flares; you say the cutting thing.", prompt: "Write what you wish you'd said instead.", effects: [{ kind: "self", delta: -1 }, { kind: "strainAlly" }] } },
    "6": { magnitude: "heavy",
      upright: { situation: "A victory, witnessed; people begin to follow.", prompt: "Who's watching you now? Write them noticing.", effects: [{ kind: "gainAlly" }] },
      reversed: { situation: "A win turns hollow; the praise rings false.", prompt: "Write the gap between how it looked and how it felt.", effects: [{ kind: "spark", delta: -2 }] } },
    "7": { magnitude: "heavy",
      upright: { situation: "You hold the high ground against the odds.", prompt: "Write the thing you refused to give up.", effects: [{ kind: "spark", delta: 2 }] },
      reversed: { situation: "Outnumbered, worn thin defending what's yours.", prompt: "Write what's costing you to protect.", effects: [{ kind: "self", delta: -2 }] } },
    "8": { magnitude: "heavy",
      upright: { situation: "Everything quickens; doors fly open at once.", prompt: "Write the rush — what's all happening at once?", effects: [{ kind: "gainItem", item: "The Swift Arrows" }] },
      reversed: { situation: "Too much at once; you drop something.", prompt: "Write what fell, and what it'll take to recover.", effects: [{ kind: "spark", delta: -2 }] } },
    "9": { magnitude: "heavy",
      upright: { situation: "Battered but standing, one more stand in you.", prompt: "Write the scar and the reason you're still up.", effects: [{ kind: "spark", delta: 2 }] },
      reversed: { situation: "Running on fumes, your guard finally drops.", prompt: "Write the moment you couldn't hold it up anymore.", effects: [{ kind: "self", delta: -2 }] } },
  },

  /* ---------------- CUPS — heart, bonds, emotion ------------------------ */
  cups: {
    A: { magnitude: "small",
      upright: { situation: "Your heart brims; a shut-off feeling floods back.", prompt: "Write what you let yourself feel.", effects: [{ kind: "self", delta: 2 }, { kind: "gainItem", item: "The Welling Cup" }] },
      reversed: { situation: "You pour your heart into the wrong vessel.", prompt: "Write what you gave, and where it went.", effects: [{ kind: "self", delta: -1 }] } },
    "2": { magnitude: "small",
      upright: { situation: "Two souls click into place; a bond is made.", prompt: "Introduce them, and the moment you knew.", effects: [{ kind: "gainAlly" }] },
      reversed: { situation: "A partnership cracks down the middle.", prompt: "Write the conversation where it broke.", effects: [{ kind: "self", delta: -1 }, { kind: "strainAlly" }] } },
    "3": { magnitude: "small",
      upright: { situation: "You fall in with good people; a friendship sparks.", prompt: "Introduce them — name, face, why you trust them.", effects: [{ kind: "gainAlly" }] },
      reversed: { situation: "You're left off the invitation.", prompt: "Write standing outside the window.", effects: [{ kind: "self", delta: -1 }] } },
    "4": { magnitude: "small",
      upright: { situation: "A quiet, restoring hour; you let yourself rest.", prompt: "Write the small thing that let you exhale.", effects: [{ kind: "self", delta: 1 }] },
      reversed: { situation: "A hand stops reaching before you answer.", prompt: "Write the letter you left unopened too long.", effects: [{ kind: "self", delta: -1 }] } },
    "5": { magnitude: "small",
      upright: { situation: "Grief, honored, becomes something you can carry.", prompt: "Write the goodbye you needed to say.", effects: [{ kind: "self", delta: 1 }] },
      reversed: { situation: "You fix on what spilled, miss what still stands.", prompt: "Write the cups still full that you can't see.", effects: [{ kind: "self", delta: -1 }] } },
    "6": { magnitude: "heavy",
      upright: { situation: "Someone from your past returns, bearing what you'd forgotten you needed.", prompt: "Who came back? Write what they brought.", effects: [{ kind: "self", delta: 2 }] },
      reversed: { situation: "Nostalgia becomes a cage you won't leave.", prompt: "Write the memory you keep living in.", effects: [{ kind: "self", delta: -2 }] } },
    "7": { magnitude: "heavy",
      upright: { situation: "Among many illusions, you see the one true thing.", prompt: "Write the vision, and how you knew it was real.", effects: [{ kind: "gainItem", item: "The Dreaming Chalice" }] },
      reversed: { situation: "You chase a beautiful lie and wake poorer.", prompt: "Write the fantasy you believed.", effects: [{ kind: "self", delta: -2 }] } },
    "8": { magnitude: "heavy",
      upright: { situation: "You rise and walk from something hollow at last.", prompt: "Write the doorway, and what you leave in it.", effects: [{ kind: "self", delta: 2 }] },
      reversed: { situation: "You stay too long in a place you've outgrown.", prompt: "Write the reason you give yourself for not leaving.", effects: [{ kind: "self", delta: -2 }] } },
    "9": { magnitude: "heavy",
      upright: { situation: "A wish granted; for one night the world is enough.", prompt: "Write the wish, and the moment it came true.", effects: [{ kind: "self", delta: 2 }] },
      reversed: { situation: "You get what you wanted and it tastes of nothing.", prompt: "Write the hollow at the center of the having.", effects: [{ kind: "self", delta: -2 }] } },
  },

  /* ---------------- SWORDS — mind, truth, conflict, pain ---------------- */
  swords: {
    A: { magnitude: "small",
      upright: { situation: "A blade of clarity; you cut to the truth of a tangle.", prompt: "Write the thing you finally see clearly.", effects: [{ kind: "gainItem", item: "The Clear Blade" }] },
      reversed: { situation: "A hard truth lands like a blow.", prompt: "Write the sentence you didn't want to hear.", effects: [{ kind: "self", delta: -1 }] } },
    "2": { magnitude: "small",
      upright: { situation: "You break a stalemate and choose cleanly.", prompt: "Write the choice, and what it cost to make it.", effects: [{ kind: "gainItem", item: "The Balance Key" }] },
      reversed: { situation: "You freeze, can't choose, and lose both.", prompt: "Write the two roads you stood between.", effects: [{ kind: "self", delta: -1 }] } },
    "3": { magnitude: "small",
      upright: { situation: "You face a sorrow plainly enough to set it down.", prompt: "Write the grief, then write putting it down.", effects: [{ kind: "self", delta: 1 }] },
      reversed: { situation: "An old heartbreak tears back open.", prompt: "Write the memory you don't want to write.", effects: [{ kind: "self", delta: -1 }] } },
    "4": { magnitude: "small",
      upright: { situation: "A still mind; you rest and see the whole field.", prompt: "Write what the quiet showed you.", effects: [{ kind: "peekTop", n: 1 }] },
      reversed: { situation: "Dread keeps the lamp lit; no rest.", prompt: "Write the 3am thought that won't leave.", effects: [{ kind: "self", delta: -1 }] } },
    "5": { magnitude: "small",
      upright: { situation: "You cut your losses wisely and walk away whole.", prompt: "Write what you chose not to fight for.", effects: [{ kind: "spark", delta: 1 }] },
      reversed: { situation: "You win the argument and lose the person.", prompt: "Write being right and alone.", effects: [{ kind: "self", delta: -1 }, { kind: "strainAlly" }] } },
    "6": { magnitude: "heavy",
      upright: { situation: "A way through to calmer water reveals itself.", prompt: "Write what you leave on the far shore.", effects: [{ kind: "gainItem", item: "The Ferryman's Token" }] },
      reversed: { situation: "You reach safety but haul the weight across.", prompt: "Write what you carried that you should have dropped.", effects: [{ kind: "self", delta: -2 }] } },
    "7": { magnitude: "heavy",
      upright: { situation: "A stolen glimpse of what's coming.", prompt: "Write what you saw ahead.", effects: [{ kind: "gainItem", item: "The Thief's Spyglass" }] },
      reversed: { situation: "Someone you leaned on has been working against you.", prompt: "Write the moment you realized.", effects: [{ kind: "self", delta: -2 }, { kind: "loseAlly" }] } },
    "8": { magnitude: "heavy",
      upright: { situation: "You find the way out of the trap you were in.", prompt: "Write the bind, and the key.", effects: [{ kind: "gainItem", item: "The Loosing Key" }] },
      reversed: { situation: "Bound by a fear that's mostly your own making.", prompt: "Write the cage, and who built it.", effects: [{ kind: "self", delta: -2 }] } },
    "9": { magnitude: "heavy",
      upright: { situation: "You face the night-terror and watch it shrink.", prompt: "Write the fear, then write it smaller.", effects: [{ kind: "self", delta: 1 }] },
      reversed: { situation: "The small hours come; your own thoughts cut deepest.", prompt: "Write the cruelest thing you tell yourself.", effects: [{ kind: "self", delta: -2 }] } },
  },

  /* ---------------- PENTACLES — body, work, home, the material ---------- */
  pentacles: {
    A: { magnitude: "small",
      upright: { situation: "A small object of true worth finds you.", prompt: "Describe it. Where did it come from?", effects: [{ kind: "gainItem", item: "The Seed-Pearl" }] },
      reversed: { situation: "A small fortune slips through your fingers.", prompt: "Write what you lost, and watching it go.", effects: [{ kind: "self", delta: -1 }] } },
    "2": { magnitude: "small",
      upright: { situation: "You juggle two demands and drop neither.", prompt: "Write the day you somehow held it all.", effects: [{ kind: "gainItem", item: "The Juggler's Coins" }] },
      reversed: { situation: "You drop one ball and they all scatter.", prompt: "Write the thing that fell first.", effects: [{ kind: "self", delta: -1 }] } },
    "3": { magnitude: "small",
      upright: { situation: "Skilled work earns you a name; a door opens.", prompt: "Introduce who opened the door for you.", effects: [{ kind: "gainItem", item: "The Mason's Mark" }, { kind: "gainAlly" }] },
      reversed: { situation: "Shoddy work undoes itself; you do it twice.", prompt: "Write the corner you cut, and the cost.", effects: [{ kind: "self", delta: -1 }] } },
    "4": { magnitude: "small",
      upright: { situation: "You secure something that's truly yours.", prompt: "Write what you finally get to keep.", effects: [{ kind: "self", delta: 1 }] },
      reversed: { situation: "You grip so tightly your greed wounds someone who trusted you.", prompt: "Write them the apology you owe.", effects: [{ kind: "self", delta: -1 }, { kind: "strainAlly" }] } },
    "5": { magnitude: "small",
      upright: { situation: "Out in the cold, you find a lit door.", prompt: "Write who took you in, and why you almost didn't knock.", effects: [{ kind: "self", delta: 1 }, { kind: "gainAlly" }] },
      reversed: { situation: "The lit window passes you by.", prompt: "Write the warmth you watched from outside.", effects: [{ kind: "self", delta: -1 }] } },
    "6": { magnitude: "heavy",
      upright: { situation: "Aid arrives, freely given.", prompt: "Write the kindness, and who gave it.", effects: [{ kind: "gainItem", item: "The Open Hand" }, { kind: "gainAlly" }] },
      reversed: { situation: "The help you take comes with a hook.", prompt: "Write what the favor really cost.", effects: [{ kind: "self", delta: -2 }] } },
    "7": { magnitude: "heavy",
      upright: { situation: "What you tended is nearly ripe.", prompt: "Write the slow thing you've been growing.", effects: [{ kind: "gainItem", item: "The Patient Vine" }] },
      reversed: { situation: "A season's labor yields nothing.", prompt: "Write the empty field you worked.", effects: [{ kind: "self", delta: -2 }] } },
    "8": { magnitude: "heavy",
      upright: { situation: "Diligence makes something worth keeping.", prompt: "Write the thing you made with your hands.", effects: [{ kind: "gainItem", item: "The Crafter's Awl" }] },
      reversed: { situation: "Endless drudgery, no closer to done.", prompt: "Write the wheel you can't stop turning.", effects: [{ kind: "self", delta: -2 }] } },
    "9": { magnitude: "heavy",
      upright: { situation: "Comfort earned by your own hand; your own garden.", prompt: "Write the life you built, in detail.", effects: [{ kind: "self", delta: 2 }] },
      reversed: { situation: "All of it built, and no one to share it.", prompt: "Write the empty chair at the full table.", effects: [{ kind: "self", delta: -2 }] } },
  },
};

/* ---------------------------------------------------------------------------
 * 9. THE TENS (§6)
 *    Reversed 10 = a Cresting (fight, HP 24 / Strike 3) — authored.
 *    Upright 10 = not in Appendix B; written for the digital game and approved
 *    by Nae (2026-06-27). Each is the culmination of its suit. authored:true.
 * ------------------------------------------------------------------------- */
export interface TenEntry {
  authored: boolean;
  upright: PipEntry; // DRAFT until you write these
}

export const TENS: Record<Suit, TenEntry> = {
  wands: { authored: true, upright: { situation: "A burden carried to its very end — the work is done, the weight still on your back.", prompt: "Write what you finished, and what it took out of you.", effects: [{ kind: "self", delta: 2 }] } },
  cups: { authored: true, upright: { situation: "Lasting joy; the table full, the people yours.", prompt: "Write the moment you knew it would last.", effects: [{ kind: "self", delta: 2 }] } },
  swords: { authored: true, upright: { situation: "Rock bottom, and the strange relief of nothing left to lose.", prompt: "Write the end of it, and the first light after.", effects: [{ kind: "self", delta: 2 }] } },
  pentacles: { authored: true, upright: { situation: "Legacy — something built to outlast you.", prompt: "Write what you'll leave behind.", effects: [{ kind: "self", delta: 2 }] } },
};

/* ---------------------------------------------------------------------------
 * 10. THE COURTS (§6, §9 — 16 cards, resolved mechanically)
 *     Upright = an ally joins (auto, suit-flavored boon).
 *     Reversed = a Reckoning (fight; HP/Strike by rank from ENEMY_BY_RANK).
 * ------------------------------------------------------------------------- */
export const COURT_PROMPT = {
  ally: "An ally enters — a favorable meeting. Introduce them: name, face, why they stand with you.",
  reckoning: "A Reckoning — a person you must face. Name them, and what's between you.",
};

/* ---------------------------------------------------------------------------
 * 11. ENDINGS (§8) — triggered when the 22nd Major is claimed, or Self → 0.
 * ------------------------------------------------------------------------- */
export type Ending = "triumph" | "bittersweet" | "ruin";
export function endingFor(self: number, majorsClaimed: number): Ending | null {
  if (self <= 0) return "ruin";
  if (majorsClaimed >= 22) return self >= 12 ? "triumph" : "bittersweet";
  return null;
}
export const ENDING_TEXT: Record<Ending, { title: string; line: string }> = {
  triumph: { title: "Triumph", line: "The great working, completed and whole." },
  bittersweet: { title: "Bittersweet", line: "You finished. It cost you everything." },
  ruin: { title: "Ruin", line: "Consumed before the work was done." },
};

/* ---------------------------------------------------------------------------
 * 11b. HOUSE RULINGS (Nae's calls on the rules-ambiguous edges)
 * ------------------------------------------------------------------------- */
export const RULINGS = {
  /** A ward (1 Spark or a Charm) cancels exactly ONE effect of a Wound — the
   *  PLAYER chooses which (the Self-loss OR a strain/lose-ally rider). Engine:
   *  on ward, if the entry has >1 effect, prompt the player to pick one to
   *  drop; apply the rest. (Most reversed pips have a single effect, so the
   *  pick only surfaces on the ~5 rider cards.) */
  wardCancelsCount: 1,
  wardChooser: "player",
  /** Reversed Majors are claimed with no mechanical cost; orientation is
   *  journaling flavor only. */
  reversedMajorCost: false,
} as const;

/* ---------------------------------------------------------------------------
 * 12. THE FOUNDING (§4) — deck composition for character creation.
 *     Split 22 Majors / 56 Minors. Draw 2 Majors (Arcana + Birthright, kept
 *     as starting spells). Draw 2 Minors (Childhood + Current Life, READ then
 *     RETURNED). Play deck = remaining 20 Majors + all 56 Minors = 76 cards.
 *     One shuffle per pile; the play deck only shrinks (no reshuffle).
 * ------------------------------------------------------------------------- */
export const DECK = {
  majors: 22,
  minors: 56,
  startingSpells: 2, // arcana + birthright
  playDeckSize: 76, // 20 majors + 56 minors
  startSelf: 22,
  startSpark: 7,
} as const;

/* ===========================================================================
 * 13. REFERENCE RESOLVER  (engine guidance — Cody may lift or replace)
 *     Turns a drawn card into a routed resolution the loop can render + apply.
 * ========================================================================= */
export type DrawnCard =
  | { type: "major"; majorId: number; orientation: Orientation }
  | { type: "pip"; suit: Suit; rank: PipRank; orientation: Orientation }
  | { type: "court"; suit: Suit; rank: CourtRank; orientation: Orientation };

export type Resolution =
  | { route: "claimSpell"; major: MajorSpell; reflection: string; orientation: Orientation }
  | { route: "ally"; suit: Suit; boon: { label: string; effect: string }; prompt: string }
  | { route: "fight"; enemy: EnemyTier; prompt: string }
  | { route: "scene"; situation: string; prompt: string; effects: Effect[]; wound: boolean };

export function resolveDraw(card: DrawnCard): Resolution {
  // MAJOR — a spell surfaces. Claimed automatically; orientation flavors journaling only.
  if (card.type === "major") {
    const major = MAJORS[card.majorId];
    return { route: "claimSpell", major, reflection: major.reflection, orientation: card.orientation };
  }

  // COURT — upright ally / reversed Reckoning.
  if (card.type === "court") {
    if (card.orientation === "upright") {
      return { route: "ally", suit: card.suit, boon: ALLY_BOON[card.suit], prompt: COURT_PROMPT.ally };
    }
    return { route: "fight", enemy: ENEMY_BY_RANK[card.rank], prompt: COURT_PROMPT.reckoning };
  }

  // PIP — Ten is special (reversed = Cresting fight); A–9 from the Oracle.
  if (card.rank === "10") {
    if (card.orientation === "reversed") {
      return { route: "fight", enemy: ENEMY_BY_RANK["10"], prompt: "A Cresting — an event at its peak. Write the moment it breaks." };
    }
    const e = TENS[card.suit].upright;
    return { route: "scene", situation: e.situation, prompt: e.prompt, effects: e.effects, wound: false };
  }

  const cardData = PIP_ORACLE[card.suit][card.rank as PipKey];
  const entry = card.orientation === "upright" ? cardData.upright : cardData.reversed;
  // Reversed A–9 is a Wound: wardable with 1 Spark or a Charm. Per RULINGS,
  // a ward cancels ONE effect of the player's choice (Self-loss OR rider).
  const wound = card.orientation === "reversed";
  return { route: "scene", situation: entry.situation, prompt: entry.prompt, effects: entry.effects, wound };
}

/* ===========================================================================
 * 14. CONTENT AUDIT — what's complete vs. needs your sign-off
 * ========================================================================= */
export const CONTENT_GAPS = [
  {
    item: "Upright 10s (×4 suits)",
    status: "RESOLVED",
    note: "Not in Appendix B; written for the digital game and approved by Nae 2026-06-27. authored:true. Culmination-of-suit themes, +2 Self each.",
  },
  {
    item: "Wound + rider effects",
    status: "RESOLVED",
    note: "A ward (1 Spark / Charm) cancels ONE effect of the player's choice (Self-loss OR strain/lose-ally rider). See RULINGS.wardCancelsCount / wardChooser.",
  },
  {
    item: "Reversed Major valence",
    status: "RESOLVED",
    note: "Reversed Majors claimed with no mechanical cost; orientation is journaling flavor only. See RULINGS.reversedMajorCost.",
  },
] as const;
