import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory IndexedDB so persist works headlessly (no real indexedDB in node).
const mem = new Map<string, string>();
vi.mock("idb-keyval", () => ({
  get: async (k: string) => mem.get(k),
  set: async (k: string, v: string) => {
    mem.set(k, v);
  },
  del: async (k: string) => {
    mem.delete(k);
  },
}));

import { useGame } from "./game";
import { matchup } from "@/content/majorot-content";

const ELEMENTS = ["fire", "water", "air", "earth"] as const;

const s = () => useGame.getState();

beforeEach(() => {
  s().reset();
  mem.clear();
});

describe("founding → playable deck", () => {
  it("rolls, commits, and lands in a playable state", () => {
    s().newRun();
    expect(s().phase).toBe("founding");

    s().rollFounding();
    expect(s().founding.arcana).not.toBeNull();
    expect(s().founding.birthright).not.toBeNull();

    s().commitFounding({
      witchName: "Vasilisa",
      stats: { fire: 4, water: 3, air: 2, earth: 1 },
      entries: [],
    });

    const st = s();
    expect(st.phase).toBe("playing");
    expect(st.witch).toBe("Vasilisa");
    expect(st.self).toBe(22);
    expect(st.spark).toBe(7);
    expect(st.chapter).toBe(1);
    expect(st.claimed).toHaveLength(2); // arcana + birthright
    expect(st.deck).toHaveLength(76); // 20 majors + 56 minors
  });
});

describe("the full loop holds its invariants", () => {
  it("plays through many draws without breaking meter bounds, and grows the journal", () => {
    s().newRun();
    s().rollFounding();
    s().commitFounding({
      witchName: "Baba",
      stats: { fire: 4, water: 3, air: 2, earth: 1 },
      entries: [],
    });

    const routesSeen = new Set<string>();
    let guard = 0;

    while (guard++ < 400) {
      const st = s();
      if (st.phase === "ending") break;

      if (st.phase === "playing") {
        if (!st.current) {
          if (st.deck.length === 0) break;
          st.draw();
          continue;
        }
        const route = st.current.resolution.route;
        routesSeen.add(route);
        if (route === "scene") s().commitScene({ playerText: "writing" });
        else if (route === "ally") s().commitAlly({ name: "A friend", playerText: "writing" });
        else if (route === "claimSpell") s().commitClaim({ playerText: "writing" });
      } else if (st.phase === "combat") {
        routesSeen.add("fight");
        const c = st.combat!;
        if (c.outcome !== "ongoing") {
          s().combatRecord("fought");
        } else if (c.step === "attack") {
          // Channel the super-effective element so fights actually resolve.
          let best = c.channel;
          let bestM = -1;
          for (const el of ELEMENTS) {
            const m = matchup(el, c.enemyElement);
            if (m > bestM) {
              bestM = m;
              best = el;
            }
          }
          s().combatSetChannel(best);
          s().combatCastBones();
        } else {
          s().combatEvade();
        }
      } else if (st.phase === "chapterTurn") {
        s().rest();
      }

      // Invariants checked every step.
      const after = s();
      expect(after.self).toBeGreaterThanOrEqual(0);
      expect(after.self).toBeLessThanOrEqual(22);
      expect(after.spark).toBeGreaterThanOrEqual(0);
      expect(after.spark).toBeLessThanOrEqual(7);
      expect(after.allies.length).toBeLessThanOrEqual(3);
    }

    const end = s();
    expect(end.journal.length).toBeGreaterThan(0);
    // A long run should exercise multiple resolution routes.
    expect(routesSeen.size).toBeGreaterThanOrEqual(2);
  });
});

describe("ruin ends the run", () => {
  it("flags Ruin when Self is driven to 0", () => {
    s().newRun();
    s().rollFounding();
    s().commitFounding({
      witchName: "Doomed",
      stats: { fire: 4, water: 3, air: 2, earth: 1 },
      entries: [],
    });
    // Drain Self via repeated rests carrying a lethal debt.
    useGame.setState({ self: 1, pendingDebts: [{ id: "x", label: "The Devil's Pact", self: -3 }] });
    s().rest();
    expect(s().self).toBe(0);
    expect(s().phase).toBe("ending");
    expect(s().ending).toBe("ruin");
  });
});
