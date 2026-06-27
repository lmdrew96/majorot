import type { Ending } from "@/content/majorot-content";
import { ENDING_TEXT } from "@/content/majorot-content";
import type { JournalEntry } from "@/store/types";

export interface BookChapter {
  chapter: number;
  /** The Major claimed to close this chapter, if any — used as the chapter title. */
  spellTitle: string | null;
  entries: JournalEntry[];
}

export interface BookMeta {
  witch: string;
  ending: Ending | null;
  spellsGathered: number;
  chapterCount: number;
  allyNames: string[];
  wordCount: number;
  /** Epoch ms the book closed (last entry, or 0). */
  closedAt: number;
}

export function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Group the journal into chapters, titling each by the spell that closed it. */
export function assembleBook(journal: JournalEntry[]): BookChapter[] {
  const map = new Map<number, JournalEntry[]>();
  for (const e of journal) {
    const list = map.get(e.chapter) ?? [];
    list.push(e);
    map.set(e.chapter, list);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([chapter, entries]) => ({
      chapter,
      spellTitle: entries.find((e) => e.route === "claimSpell")?.cardLabel ?? null,
      entries,
    }));
}

/** Entries worth printing — the ones the player actually wrote. */
export function writtenEntries(entries: JournalEntry[]): JournalEntry[] {
  return entries.filter((e) => e.playerText.trim().length > 0);
}

/** Minimal int → Roman numeral (chapters never exceed ~22). */
export function toRoman(n: number): string {
  const table: [number, string][] = [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  let v = n;
  for (const [num, sym] of table) {
    while (v >= num) {
      out += sym;
      v -= num;
    }
  }
  return out || "0";
}

/** Render the assembled run as Markdown — the downloadable book. */
export function journalToMarkdown(meta: BookMeta, book: BookChapter[]): string {
  const lines: string[] = [];
  const end = meta.ending ? ENDING_TEXT[meta.ending] : null;

  lines.push(`# ${meta.witch}'s Working`);
  lines.push("");
  if (end) lines.push(`*${end.title} — ${end.line}*`);
  lines.push("");
  lines.push(
    [
      `Spells gathered: ${meta.spellsGathered}/22`,
      `Chapters: ${meta.chapterCount}`,
      `Allies: ${meta.allyNames.length ? meta.allyNames.join(", ") : "none"}`,
      `Words written: ${meta.wordCount}`,
    ].join("  ·  "),
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const ch of book) {
    const written = writtenEntries(ch.entries);
    lines.push(`## Chapter ${toRoman(ch.chapter)}${ch.spellTitle ? ` — ${ch.spellTitle}` : ""}`);
    lines.push("");
    if (written.length === 0) {
      lines.push("_— this chapter went unwritten —_");
      lines.push("");
      continue;
    }
    for (const e of written) {
      const orient = e.orientation ? ` (${e.orientation})` : "";
      lines.push(`**${e.cardLabel}${orient}**`);
      lines.push("");
      lines.push(`> ${e.prompt}`);
      lines.push("");
      lines.push(e.playerText.trim());
      lines.push("");
    }
  }

  lines.push("---");
  lines.push(`*Set down by ${meta.witch}.*`);
  lines.push("");
  return lines.join("\n");
}

/** Trigger a client-side download of text content (the player saving their book). */
export function downloadText(filename: string, text: string, mime = "text/markdown;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const SLUG_RE = /[^a-z0-9]+/gi;
export function slugify(name: string): string {
  return name.trim().toLowerCase().replace(SLUG_RE, "-").replace(/^-+|-+$/g, "") || "working";
}
