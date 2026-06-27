const FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

/** A d6 face. Falls back to 🎲 before the first roll. */
export function Die({ n }: { n: number | null }) {
  return <span className="mj-die">{n && n >= 1 && n <= 6 ? FACES[n - 1] : "🎲"}</span>;
}
