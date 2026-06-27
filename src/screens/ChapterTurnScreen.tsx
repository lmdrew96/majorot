import { useGame } from "@/store/game";
import { MAJORS } from "@/content/majorot-content";
import { Meters } from "@/components/Meters";

/** The chapter-close ceremony: the page turns, you Rest, the next chapter opens. */
export function ChapterTurnScreen() {
  const chapter = useGame((s) => s.chapter);
  const claimed = useGame((s) => s.claimed);
  const self = useGame((s) => s.self);
  const spark = useGame((s) => s.spark);
  const pendingDebts = useGame((s) => s.pendingDebts);
  const rest = useGame((s) => s.rest);

  const lastClaim = claimed[claimed.length - 1];
  const major = lastClaim ? MAJORS[lastClaim.majorId] : null;

  return (
    <div className="mj-app">
      <div className="mj-shell">
        <Meters self={self} spark={spark} />

        <div className="mj-panel mj-chapter">
          <p className="mj-eyebrow">Chapter {chapter} closes</p>
          <h2 className="mj-chapter__title">Turn the page</h2>

          {major && (
            <p className="mj-chapter__claim">
              You claimed <strong>{major.roman} · {major.name}</strong> — that makes{" "}
              <strong>{claimed.length} of 22</strong> spells gathered.
            </p>
          )}

          {pendingDebts.length > 0 && (
            <div className="mj-chapter__debts">
              <span className="mj-eyebrow">Debts come due on rest</span>
              <ul>
                {pendingDebts.map((d) => (
                  <li key={d.id}>
                    {d.label}
                    {d.self ? ` — ${d.self} Self` : ""}
                    {d.spark ? ` — ${d.spark} Spark` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mj-note">
            Rest refills Spark to 7 and refreshes your allies' boons. Self stays hard-won.
          </p>

          <button className="mj-btn" onClick={rest}>
            Rest · open Chapter {chapter + 1}
          </button>
        </div>
      </div>
    </div>
  );
}
