import { describe, it, expect } from "vitest";
import {
  ALLY_CAP,
  applyEffects,
  canWard,
  clampSelf,
  clampSpark,
  dropEffectAt,
  effectNeeds,
  payWard,
} from "./effects";
import type { Ally, EffectSlice, KitEntry } from "@/store/types";
import type { Effect } from "@/content/majorot-content";

let n = 0;
const makeId = () => `id-${++n}`;

const ally = (over: Partial<Ally> = {}): Ally => ({
  id: makeId(),
  name: "Ally",
  suit: "cups",
  boonUsed: false,
  strained: false,
  ...over,
});

const charm = (): KitEntry => ({
  id: makeId(),
  name: "Charm",
  suit: "none",
  stays: false,
  use: "+2 to a cast, or ward a Wound.",
});

const slice = (over: Partial<EffectSlice> = {}): EffectSlice => ({
  self: 10,
  spark: 4,
  allies: [],
  kit: [],
  ...over,
});

describe("clamps", () => {
  it("self clamps to 0–22", () => {
    expect(clampSelf(-5)).toBe(0);
    expect(clampSelf(99)).toBe(22);
    expect(clampSelf(11)).toBe(11);
  });
  it("spark clamps to 0–7", () => {
    expect(clampSpark(-1)).toBe(0);
    expect(clampSpark(12)).toBe(7);
  });
});

describe("applyEffects — meters", () => {
  it("applies self/spark deltas with clamping", () => {
    const r = applyEffects(slice({ self: 20, spark: 6 }), [
      { kind: "self", delta: 5 },
      { kind: "spark", delta: 3 },
    ]);
    expect(r.slice.self).toBe(22);
    expect(r.slice.spark).toBe(7);
    expect(r.ruin).toBe(false);
  });

  it("flags Ruin when Self hits 0", () => {
    const r = applyEffects(slice({ self: 2 }), [{ kind: "self", delta: -2 }]);
    expect(r.slice.self).toBe(0);
    expect(r.ruin).toBe(true);
  });

  it("does not mutate the input slice", () => {
    const s = slice({ self: 10, spark: 4 });
    applyEffects(s, [{ kind: "self", delta: -3 }, { kind: "spark", delta: -1 }]);
    expect(s.self).toBe(10);
    expect(s.spark).toBe(4);
  });
});

describe("applyEffects — kit", () => {
  it("adds a known Kit item with its real metadata", () => {
    const r = applyEffects(slice(), [{ kind: "gainItem", item: "The Welling Cup" }], { makeId });
    expect(r.slice.kit).toHaveLength(1);
    expect(r.slice.kit[0]).toMatchObject({ name: "The Welling Cup", suit: "cups", stays: true });
  });
});

describe("applyEffects — allies", () => {
  it("adds an ally with the granting card's suit + chosen name", () => {
    const r = applyEffects(slice(), [{ kind: "gainAlly" }], {
      makeId,
      allyName: "Mirela",
      allySuit: "pentacles",
    });
    expect(r.slice.allies).toHaveLength(1);
    expect(r.slice.allies[0]).toMatchObject({ name: "Mirela", suit: "pentacles", strained: false });
  });

  it("passes (declines) a new ally when the circle is full", () => {
    const full = [ally(), ally(), ally()];
    expect(full).toHaveLength(ALLY_CAP);
    const r = applyEffects(slice({ allies: full }), [{ kind: "gainAlly" }], {
      makeId,
      allyName: "Late",
    });
    expect(r.slice.allies).toHaveLength(ALLY_CAP);
    expect(r.notes.join(" ")).toMatch(/full/i);
  });

  it("strains the chosen ally", () => {
    const a = ally({ name: "A" });
    const b = ally({ name: "B" });
    const r = applyEffects(slice({ allies: [a, b] }), [{ kind: "strainAlly" }], {
      allyTargetId: b.id,
    });
    expect(r.slice.allies.find((x) => x.id === b.id)?.strained).toBe(true);
    expect(r.slice.allies.find((x) => x.id === a.id)?.strained).toBe(false);
  });

  it("loses the chosen ally", () => {
    const a = ally({ name: "A" });
    const b = ally({ name: "B" });
    const r = applyEffects(slice({ allies: [a, b] }), [{ kind: "loseAlly" }], {
      allyTargetId: a.id,
    });
    expect(r.slice.allies.map((x) => x.id)).toEqual([b.id]);
  });

  it("strain on no allies is a safe no-op", () => {
    const r = applyEffects(slice(), [{ kind: "strainAlly" }]);
    expect(r.slice.allies).toHaveLength(0);
    expect(r.notes.join(" ")).toMatch(/no unstrained/i);
  });
});

describe("applyEffects — markers", () => {
  it("raises rival + peek tags", () => {
    const r = applyEffects(slice(), [{ kind: "markRival" }, { kind: "peekTop", n: 3 }]);
    expect(r.tags).toContain("rival");
    expect(r.tags).toContain("peek:3");
  });
});

describe("effectNeeds", () => {
  it("needs a name only when there is room for the ally", () => {
    expect(effectNeeds([{ kind: "gainAlly" }], []).needsAllyName).toBe(true);
    expect(effectNeeds([{ kind: "gainAlly" }], [ally(), ally(), ally()]).needsAllyName).toBe(false);
  });
  it("asks for a strain target only when >1 candidate", () => {
    expect(effectNeeds([{ kind: "strainAlly" }], [ally()]).allyChoice).toBeNull();
    const two = effectNeeds([{ kind: "strainAlly" }], [ally(), ally()]).allyChoice;
    expect(two?.op).toBe("strain");
    expect(two?.candidates).toHaveLength(2);
  });
});

describe("ward", () => {
  it("can ward with Spark or a Charm, not when neither", () => {
    expect(canWard(slice({ spark: 1, kit: [] }))).toBe(true);
    expect(canWard(slice({ spark: 0, kit: [charm()] }))).toBe(true);
    expect(canWard(slice({ spark: 0, kit: [] }))).toBe(false);
  });

  it("prefers Spark, falling back to a Charm", () => {
    const both = slice({ spark: 3, kit: [charm()] });
    const paid = payWard(both);
    expect(paid?.paidWith).toBe("spark");
    expect(paid?.slice.spark).toBe(2);
    expect(paid?.slice.kit).toHaveLength(1); // charm untouched

    const onlyCharm = slice({ spark: 0, kit: [charm()] });
    const paid2 = payWard(onlyCharm);
    expect(paid2?.paidWith).toBe("charm");
    expect(paid2?.slice.kit).toHaveLength(0);
  });

  it("returns null when unaffordable", () => {
    expect(payWard(slice({ spark: 0, kit: [] }))).toBeNull();
  });

  it("dropEffectAt removes exactly the warded effect", () => {
    const effects: Effect[] = [
      { kind: "self", delta: -1 },
      { kind: "strainAlly" },
    ];
    expect(dropEffectAt(effects, 0)).toEqual([{ kind: "strainAlly" }]);
    expect(dropEffectAt(effects, 1)).toEqual([{ kind: "self", delta: -1 }]);
    expect(dropEffectAt(effects, 9)).toEqual(effects); // out of range = unchanged
  });
});
