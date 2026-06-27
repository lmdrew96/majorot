import { useState } from "react";
import { useGame, hasSavedRun } from "@/store/game";

export function TitleScreen({ onEnter }: { onEnter: () => void }) {
  const newRun = useGame((s) => s.newRun);
  const hasSave = useGame(hasSavedRun);
  const [confirmNew, setConfirmNew] = useState(false);

  const begin = () => {
    newRun();
    onEnter();
  };

  return (
    <div className="mj-app">
      <div className="mj-shell mj-title">
        <p className="mj-eyebrow">A solo journaling tarot game</p>
        <h1 className="mj-title__name">The Majorot</h1>
        <p className="mj-title__tag">
          Draw your fate. Write your witch. Gather all twenty-two spells before the
          work consumes you — and leave a finished book behind.
        </p>

        <div className="mj-title__actions">
          {hasSave && (
            <button className="mj-btn" onClick={onEnter}>
              Continue your working
            </button>
          )}

          {!hasSave && (
            <button className="mj-btn" onClick={begin}>
              Begin the Founding
            </button>
          )}

          {hasSave && !confirmNew && (
            <button className="mj-btn mj-btn--ghost" onClick={() => setConfirmNew(true)}>
              Start a new working
            </button>
          )}

          {hasSave && confirmNew && (
            <div className="mj-title__confirm">
              <span>This wipes your current working.</span>
              <div className="mj-row">
                <button className="mj-btn mj-btn--danger" onClick={begin}>
                  Wipe &amp; begin
                </button>
                <button className="mj-btn mj-btn--ghost" onClick={() => setConfirmNew(false)}>
                  Keep it
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
