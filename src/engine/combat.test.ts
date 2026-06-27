import { describe, it, expect } from "vitest";
import {
  attackPreview,
  bestChannel,
  bonesDamage,
  bonesKind,
  evadeSlips,
  rollD6,
} from "./combat";
import { mulberry32 } from "./deck";

describe("the Bones", () => {
  it("reads 1 backfire / 2–5 hit / 6 surge", () => {
    expect(bonesKind(1)).toBe("backfire");
    expect([2, 3, 4, 5].map(bonesKind)).toEqual(["hit", "hit", "hit", "hit"]);
    expect(bonesKind(6)).toBe("surge");
  });

  it("applies the outcome to base damage", () => {
    expect(bonesDamage(10, "backfire")).toBe(0);
    expect(bonesDamage(10, "hit")).toBe(10);
    expect(bonesDamage(10, "surge")).toBe(20);
  });

  it("rolls within 1–6", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 200; i++) {
      const r = rollD6(rng);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(6);
    }
  });
});

describe("evade", () => {
  it("slips on 4–6, connects on 1–3", () => {
    expect([1, 2, 3].map(evadeSlips)).toEqual([false, false, false]);
    expect([4, 5, 6].map(evadeSlips)).toEqual([true, true, true]);
  });
});

describe("attackPreview (matchup wheel)", () => {
  // Wheel: Water▸Fire▸Air▸Earth▸(Water). Predator → prey is super-effective.
  it("super-effective doubles (water → fire)", () => {
    const p = attackPreview(4, 1, "water", "fire");
    expect(p.multiplier).toBe(2);
    expect(p.damage).toBe(Math.floor((4 + 1) * 2)); // 10
  });

  it("dead matchup deals 0 (fire → water)", () => {
    const p = attackPreview(7, 4, "fire", "water");
    expect(p.multiplier).toBe(0);
    expect(p.damage).toBe(0);
  });

  it("mirror halves and floors (water → water)", () => {
    const p = attackPreview(4, 1, "water", "water");
    expect(p.multiplier).toBe(0.5);
    expect(p.damage).toBe(2); // floor(5 * 0.5)
  });

  it("neutral is ×1 (water → air)", () => {
    const p = attackPreview(4, 1, "water", "air");
    expect(p.multiplier).toBe(1);
    expect(p.damage).toBe(5);
  });
});

describe("bestChannel", () => {
  it("picks the super-effective element against an enemy", () => {
    // The predator of fire is water; of air is fire; of earth is air; of water is earth.
    expect(bestChannel("fire")).toBe("water");
    expect(bestChannel("air")).toBe("fire");
    expect(bestChannel("earth")).toBe("air");
    expect(bestChannel("water")).toBe("earth");
  });
});
