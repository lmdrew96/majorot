import { useMemo } from "react";
import { useGame } from "@/store/game";
import { ENDING_TEXT } from "@/content/majorot-content";
import type { JournalEntry } from "@/store/types";
import {
  assembleBook,
  countWords,
  downloadText,
  journalToMarkdown,
  slugify,
  toRoman,
  writtenEntries,
  type BookMeta,
} from "@/lib/exportJournal";

const DATE_FMT: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" };

export function EndingScreen({ onReturnToTitle }: { onReturnToTitle: () => void }) {
  const ending = useGame((s) => s.ending);
  const witch = useGame((s) => s.witch);
  const journal = useGame((s) => s.journal);
  const claimed = useGame((s) => s.claimed);
  const allies = useGame((s) => s.allies);
  const newRun = useGame((s) => s.newRun);

  const book = useMemo(() => assembleBook(journal), [journal]);
  const end = ending ? ENDING_TEXT[ending] : null;

  const meta: BookMeta = useMemo(() => {
    const closedAt = journal.length ? journal[journal.length - 1].ts : 0;
    return {
      witch: witch || "The Witch",
      ending,
      spellsGathered: claimed.length,
      chapterCount: book.length,
      allyNames: allies.map((a) => a.name),
      wordCount: journal.reduce((n, e) => n + countWords(e.playerText), 0),
      closedAt,
    };
  }, [journal, witch, ending, claimed.length, book.length, allies]);

  const closedDate = meta.closedAt
    ? new Date(meta.closedAt).toLocaleDateString(undefined, DATE_FMT)
    : "";

  const onDownload = () =>
    downloadText(`${slugify(meta.witch)}-working.md`, journalToMarkdown(meta, book));

  return (
    <div className="mj-app">
      <div className="mj-shell mj-ending">
        <article className={`mj-book mj-book--${ending ?? "ruin"}`}>
          {/* Frontispiece */}
          <header className="mj-book__cover">
            <span className="mj-book__ornament">✦</span>
            <p className="mj-eyebrow">
              A working in {meta.chapterCount} {meta.chapterCount === 1 ? "chapter" : "chapters"}
            </p>
            <h1 className="mj-book__title">{meta.witch}</h1>
            {end && (
              <>
                <p className="mj-book__seal">{end.title}</p>
                <p className="mj-book__epigraph">“{end.line}”</p>
              </>
            )}
            <dl className="mj-book__stats">
              <div>
                <dt>Spells</dt>
                <dd>{meta.spellsGathered}/22</dd>
              </div>
              <div>
                <dt>Chapters</dt>
                <dd>{meta.chapterCount}</dd>
              </div>
              <div>
                <dt>Allies</dt>
                <dd>{meta.allyNames.length || "—"}</dd>
              </div>
              <div>
                <dt>Words</dt>
                <dd>{meta.wordCount}</dd>
              </div>
            </dl>
          </header>

          {/* The body */}
          {book.map((ch) => {
            const written = writtenEntries(ch.entries);
            return (
              <section key={ch.chapter} className="mj-book__chapter">
                <h2 className="mj-book__chapterhead">
                  <span className="mj-book__chapternum">Chapter {toRoman(ch.chapter)}</span>
                  {ch.spellTitle && <span className="mj-book__chaptertitle">{ch.spellTitle}</span>}
                </h2>
                {written.length === 0 ? (
                  <p className="mj-book__blank">— this chapter went unwritten —</p>
                ) : (
                  written.map((e, i) => <Passage key={e.id} entry={e} lead={i === 0} />)
                )}
              </section>
            );
          })}

          {/* Colophon */}
          <footer className="mj-book__colophon">
            <span className="mj-book__ornament">✦</span>
            {end && <p className="mj-book__finis">{end.line}</p>}
            <p className="mj-book__colo">
              Set down by {meta.witch}
              {closedDate ? ` · ${closedDate}` : ""} · {meta.wordCount} words across{" "}
              {meta.chapterCount} {meta.chapterCount === 1 ? "chapter" : "chapters"}.
            </p>
          </footer>
        </article>

        <div className="mj-row mj-ending__actions">
          <button className="mj-btn" onClick={() => window.print()}>
            Print · Save as PDF
          </button>
          <button className="mj-btn mj-btn--ghost" onClick={onDownload}>
            Download the book
          </button>
          <button className="mj-btn mj-btn--ghost" onClick={newRun}>
            Begin a new working
          </button>
          <button className="mj-btn mj-btn--ghost" onClick={onReturnToTitle}>
            Return to the title
          </button>
        </div>
      </div>
    </div>
  );
}

function Passage({ entry, lead }: { entry: JournalEntry; lead: boolean }) {
  return (
    <div className="mj-book__passage">
      <p className="mj-book__cardline">
        {entry.cardLabel}
        {entry.orientation && <span className="mj-book__orient"> · {entry.orientation}</span>}
      </p>
      <p className="mj-book__prompt">{entry.prompt}</p>
      <p className={`mj-book__prose ${lead ? "has-dropcap" : ""}`}>{entry.playerText}</p>
    </div>
  );
}
