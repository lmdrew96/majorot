import { describe, it, expect } from "vitest";
import {
  allMinors,
  buildPlayDeck,
  cardLabel,
  drawCard,
  foundingDraw,
  mulberry32,
  rollOrientation,
  shuffle,
  toDrawnCard,
  MAJOR_IDS,
  type CardId,
} from "./deck";
import { resolveDraw } from "@/content/majorot-content";

const keyOf = (c: CardId): string =>
  c.type === "major" ? `M${c.majorId}` : `m-${c.suit}-${c.rank}`;

describe("minors", () => {
  it("produces 56 unique minors (14 ranks × 4 suits)", () => {
    const minors = allMinors();
    expect(minors).toHaveLength(56);
    expect(new Set(minors.map(keyOf)).size).toBe(56);
  });
});

describe("buildPlayDeck", () => {
  it("builds a 76-card deck: 20 majors + all 56 minors", () => {
    const deck = buildPlayDeck([3, 14]);
    expect(deck).toHaveLength(76);
    const majors = deck.filter((c) => c.type === "major");
    const minors = deck.filter((c) => c.type === "minor");
    expect(majors).toHaveLength(20);
    expect(minors).toHaveLength(56);
  });

  it("removes exactly the founding majors and keeps the other 20", () => {
    const deck = buildPlayDeck([0, 21]);
    const majorIds = deck.filter((c) => c.type === "major").map((c) => c.majorId);
    expect(majorIds).not.toContain(0);
    expect(majorIds).not.toContain(21);
    expect(new Set(majorIds)).toEqual(new Set(MAJOR_IDS.filter((id) => id !== 0 && id !== 21)));
  });

  it("contains no duplicate cards", () => {
    const deck = buildPlayDeck([5, 9]);
    expect(new Set(deck.map(keyOf)).size).toBe(deck.length);
  });

  it("is reproducible for a fixed seed", () => {
    const a = buildPlayDeck([1, 2], mulberry32(42)).map(keyOf);
    const b = buildPlayDeck([1, 2], mulberry32(42)).map(keyOf);
    expect(a).toEqual(b);
  });
});

describe("shuffle", () => {
  it("never mutates the input array", () => {
    const input = allMinors();
    const snapshot = input.map(keyOf);
    shuffle(input, mulberry32(7));
    expect(input.map(keyOf)).toEqual(snapshot);
  });

  it("preserves the multiset of items", () => {
    const input = allMinors();
    const out = shuffle(input, mulberry32(99));
    expect(out.map(keyOf).sort()).toEqual(input.map(keyOf).sort());
  });
});

describe("rollOrientation", () => {
  it("honors a forced orientation regardless of rng", () => {
    expect(rollOrientation(() => 0.99, "upright")).toBe("upright");
    expect(rollOrientation(() => 0.01, "reversed")).toBe("reversed");
  });

  it("splits 50/50 on the rng boundary", () => {
    expect(rollOrientation(() => 0.49)).toBe("upright");
    expect(rollOrientation(() => 0.5)).toBe("reversed");
  });
});

describe("toDrawnCard", () => {
  it("routes pip vs court correctly", () => {
    expect(toDrawnCard({ type: "minor", suit: "cups", rank: "3" }, "upright")).toEqual({
      type: "pip",
      suit: "cups",
      rank: "3",
      orientation: "upright",
    });
    expect(toDrawnCard({ type: "minor", suit: "swords", rank: "queen" }, "reversed")).toEqual({
      type: "court",
      suit: "swords",
      rank: "queen",
      orientation: "reversed",
    });
    expect(toDrawnCard({ type: "major", majorId: 13 }, "upright")).toEqual({
      type: "major",
      majorId: 13,
      orientation: "upright",
    });
  });
});

describe("drawCard", () => {
  it("removes one card without mutating the input deck", () => {
    const deck = buildPlayDeck([3, 14], mulberry32(1));
    const before = deck.length;
    const { deck: after, drawn } = drawCard(deck, { rng: mulberry32(2) });
    expect(after).toHaveLength(before - 1);
    expect(deck).toHaveLength(before); // unmutated
    expect(drawn).toBeTruthy();
  });

  it("can draw the whole deck, then throws on empty", () => {
    let deck: CardId[] = buildPlayDeck([3, 14], mulberry32(5));
    const seen: string[] = [];
    while (deck.length > 0) {
      const res = drawCard(deck, { rng: mulberry32(deck.length) });
      seen.push(keyOf(res.card));
      deck = res.deck;
    }
    expect(seen).toHaveLength(76);
    expect(new Set(seen).size).toBe(76); // every card unique
    expect(() => drawCard(deck)).toThrow(/empty/);
  });

  it("forwards a forced orientation to the drawn card", () => {
    const deck = buildPlayDeck([3, 14], mulberry32(8));
    const { drawn } = drawCard(deck, { rng: () => 0.99, forcedOrientation: "upright" });
    expect(drawn.orientation).toBe("upright");
  });
});

describe("integration with resolveDraw", () => {
  it("every card the deck can produce resolves to a known route, both orientations", () => {
    const routes = new Set<string>();
    for (const card of [
      ...MAJOR_IDS.map((majorId) => ({ type: "major", majorId }) as CardId),
      ...allMinors(),
    ]) {
      for (const orientation of ["upright", "reversed"] as const) {
        const drawn = toDrawnCard(card, orientation);
        const res = resolveDraw(drawn);
        expect(["claimSpell", "ally", "fight", "scene"]).toContain(res.route);
        routes.add(res.route);
      }
    }
    // Sanity: across the full deck we exercise every route at least once.
    expect(routes).toEqual(new Set(["claimSpell", "ally", "fight", "scene"]));
  });
});

describe("foundingDraw", () => {
  it("yields distinct arcana/birthright majors and two minors to read", () => {
    const f = foundingDraw(mulberry32(123));
    expect(f.arcana.majorId).not.toBe(f.birthright.majorId);
    expect(f.removedMajorIds).toEqual([f.arcana.majorId, f.birthright.majorId]);
    expect(f.childhood.type === "pip" || f.childhood.type === "court").toBe(true);
    expect(f.currentLife.type === "pip" || f.currentLife.type === "court").toBe(true);
  });

  it("removed founding majors are absent from the resulting play deck", () => {
    const f = foundingDraw(mulberry32(321));
    const deck = buildPlayDeck(f.removedMajorIds, mulberry32(321));
    const majorIds = deck.filter((c) => c.type === "major").map((c) => c.majorId);
    for (const id of f.removedMajorIds) expect(majorIds).not.toContain(id);
    expect(deck).toHaveLength(76);
  });
});

describe("cardLabel", () => {
  it("labels majors and minors readably", () => {
    expect(cardLabel({ type: "major", majorId: 2, orientation: "upright" })).toBe(
      "II · The High Priestess",
    );
    expect(cardLabel({ type: "pip", suit: "cups", rank: "3", orientation: "upright" })).toBe(
      "Three of Cups",
    );
    expect(cardLabel({ type: "court", suit: "swords", rank: "king", orientation: "reversed" })).toBe(
      "King of Swords",
    );
  });
});
