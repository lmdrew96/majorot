import { SELF_MAX, SPARK_MAX } from "@/engine/effects";

/** The Triumph/Bittersweet/Ruin zone the current Self sits in (threshold = 12). */
export function selfZone(self: number): { label: string; cls: string } {
  if (self <= 0) return { label: "Ruin", cls: "ruin" };
  if (self < 12) return { label: "Bittersweet", cls: "bittersweet" };
  return { label: "Triumph", cls: "triumph" };
}

function SelfBar({ value }: { value: number }) {
  const belowThreshold = value < 12;
  return (
    <div className="mj-selfbar" role="img" aria-label={`Self ${value} of ${SELF_MAX}`}>
      {Array.from({ length: SELF_MAX }, (_, i) => {
        const n = i + 1;
        const filled = n <= value;
        return (
          <span
            key={n}
            className={[
              "mj-selfbar__tick",
              filled ? "is-filled" : "",
              filled && belowThreshold ? "is-low" : "",
              n === 12 ? "is-threshold" : "",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}

function SparkPips({ value }: { value: number }) {
  return (
    <div className="mj-sparkpips" role="img" aria-label={`Spark ${value} of ${SPARK_MAX}`}>
      {Array.from({ length: SPARK_MAX }, (_, i) => (
        <span key={i} className={`mj-sparkpip ${i < value ? "is-on" : ""}`} />
      ))}
    </div>
  );
}

/** Read-only HUD — the game drives these; the player never sets them by hand. */
export function Meters({ self, spark }: { self: number; spark: number }) {
  const zone = selfZone(self);
  return (
    <div className="mj-meters">
      <div className="mj-meter">
        <div className="mj-meter__head">
          <span className="mj-meter__title">Self</span>
          <span className={`mj-zone mj-zone--${zone.cls}`}>{zone.label}</span>
          <span className="mj-meter__num">
            {self}
            <em>/{SELF_MAX}</em>
          </span>
        </div>
        <SelfBar value={self} />
      </div>

      <div className="mj-meter">
        <div className="mj-meter__head">
          <span className="mj-meter__title">Spark</span>
          <span className="mj-meter__num">
            {spark}
            <em>/{SPARK_MAX}</em>
          </span>
        </div>
        <SparkPips value={spark} />
      </div>
    </div>
  );
}
