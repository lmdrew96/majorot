import type { JournalEntry } from "@/store/types";

const ROUTE_LABEL: Record<JournalEntry["route"], string> = {
  scene: "Scene",
  ally: "Ally",
  claimSpell: "Spell",
  fight: "Reckoning",
};

/** One journal beat, as it reads in the assembled book. */
export function JournalEntryView({ entry }: { entry: JournalEntry }) {
  return (
    <article className="mj-entry">
      <header className="mj-entry__head">
        <span className="mj-entry__card">{entry.cardLabel}</span>
        {entry.orientation && (
          <span className={`mj-entry__orient is-${entry.orientation}`}>{entry.orientation}</span>
        )}
        <span className="mj-entry__route">{ROUTE_LABEL[entry.route]}</span>
      </header>
      <p className="mj-entry__prompt">{entry.prompt}</p>
      {entry.playerText.trim() ? (
        <p className="mj-entry__text">{entry.playerText}</p>
      ) : (
        <p className="mj-entry__text is-blank">— left unwritten —</p>
      )}
    </article>
  );
}
