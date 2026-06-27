import type { Effect } from "@/content/majorot-content";

export type EffectTone = "gain" | "loss" | "neutral";

/** A short, human label + valence for an Effect, for badges/previews. */
export function effectLabel(e: Effect): { text: string; tone: EffectTone } {
  switch (e.kind) {
    case "self":
      return { text: `${e.delta >= 0 ? "+" : ""}${e.delta} Self`, tone: e.delta >= 0 ? "gain" : "loss" };
    case "spark":
      return { text: `${e.delta >= 0 ? "+" : ""}${e.delta} Spark`, tone: e.delta >= 0 ? "gain" : "loss" };
    case "gainItem":
      return { text: e.item, tone: "gain" };
    case "gainAlly":
      return { text: "An ally joins", tone: "gain" };
    case "strainAlly":
      return { text: "An ally is strained", tone: "loss" };
    case "loseAlly":
      return { text: "An ally is lost", tone: "loss" };
    case "markRival":
      return { text: "A rival is marked", tone: "neutral" };
    case "peekTop":
      return { text: `Peek the top ${e.n}`, tone: "neutral" };
  }
}
