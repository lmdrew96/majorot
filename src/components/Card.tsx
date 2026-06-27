import type { DrawnCard } from "@/content/majorot-content";
import { MAJORS } from "@/content/majorot-content";
import { SUIT_GLYPH, cardLabel } from "@/engine/deck";

const RANK_GLYPH: Record<string, string> = {
  A: "A",
  "10": "10",
  page: "P",
  knight: "Kn",
  queen: "Q",
  king: "K",
};

const shortRank = (rank: string): string => RANK_GLYPH[rank] ?? rank;

/**
 * The typographic card face — no licensed art (Phase 1). Suit glyph + rank +
 * orientation + name. Upright reads jade; reversed reads plum (and inverts).
 */
export function Card({
  drawn,
  size = "md",
}: {
  drawn: DrawnCard;
  size?: "sm" | "md" | "lg";
}) {
  const upright = drawn.orientation === "upright";
  const orientCls = upright ? "is-upright" : "is-reversed";

  if (drawn.type === "major") {
    const m = MAJORS[drawn.majorId];
    return (
      <figure className={`mj-card mj-card--major ${orientCls} sz-${size}`}>
        <span className="mj-card__rank">{m.roman}</span>
        <span className="mj-card__glyph">✶</span>
        <figcaption className="mj-card__name">{m.name}</figcaption>
        <span className="mj-card__orient">{upright ? "upright" : "reversed"}</span>
      </figure>
    );
  }

  return (
    <figure className={`mj-card mj-card--minor ${orientCls} sz-${size}`}>
      <span className="mj-card__rank">{shortRank(drawn.rank)}</span>
      <span className="mj-card__glyph">{SUIT_GLYPH[drawn.suit]}</span>
      <figcaption className="mj-card__name">{cardLabel(drawn)}</figcaption>
      <span className="mj-card__orient">{upright ? "upright" : "reversed"}</span>
    </figure>
  );
}
