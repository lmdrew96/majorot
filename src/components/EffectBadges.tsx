import type { Effect } from "@/content/majorot-content";
import { effectLabel } from "@/lib/effectLabel";

/** A row of effect chips — the mechanical preview beneath a scene. */
export function EffectBadges({ effects }: { effects: readonly Effect[] }) {
  if (effects.length === 0) {
    return <span className="mj-badges__none">No mechanical effect — the writing is the point.</span>;
  }
  return (
    <div className="mj-badges">
      {effects.map((e, i) => {
        const { text, tone } = effectLabel(e);
        return (
          <span key={i} className={`mj-badge mj-badge--${tone}`}>
            {text}
          </span>
        );
      })}
    </div>
  );
}
