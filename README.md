# The Majorot

**A solo journaling tarot game.** Draw your fate from a full tarot deck, write your
witch into being one card at a time, and gather all twenty-two Major spells before
the work consumes you — then leave a finished book behind.

The Majorot is a single-player, local-first game where **the writing is the point**.
Every card you draw surfaces a scene and a prompt; what you write *is* the play. Cards
also carry light mechanics — meters, a kit, allies, and elemental combat — but the
journal you assemble is the real artifact. When the run ends, your run is bound into a
readable book you can print or export.

> Designed by **Nae** (ADHDesigns). Built with [Claude Code](https://claude.com/claude-code).

---

## How it plays

1. **The Founding** — a guided ritual draws your **Arcana** (who you are) and
   **Birthright** (what you were owed) as your first two spells, reads your
   **Childhood** and **Current Life**, and sets your **Favored Magic** (4 / 3 / 2 / 1
   across the elements). Name your witch and begin.
2. **The loop** — draw a card. The deck routes it:
   - a **Scene** to write (some leave a Wound you can *ward* with Spark or a Charm),
   - an **Ally** who joins your circle (an upright Court),
   - a **Spell** that surfaces and closes the chapter (a Major), or
   - a **Reckoning / Cresting** — a fight (a reversed Court or reversed Ten).
3. **Combat** — channel an element against the threat's, *Cast the Bones* (a d6:
   backfire / hit / surge), and *Evade* its Strike. Win for Spark; fall to Ruin.
4. **Chapters & endings** — claiming a Major turns the page and you Rest. Gather all
   22 spells, or run out of Self, and the game ends in **Triumph**, **Bittersweet**,
   or **Ruin** — and your whole run is assembled into a finished book.

The deck is a full 78-card tarot. Suits bind to elements (Wands·Fire, Cups·Water,
Swords·Air, Pentacles·Earth) on a matchup wheel where each element melts the next.

## Run it locally

```bash
pnpm install
pnpm dev        # http://localhost:5173
```

```bash
pnpm test       # unit + integration tests (Vitest)
pnpm typecheck  # tsc --noEmit
pnpm build      # production build
```

## Tech

- **Vite + React + TypeScript**
- **Zustand** with `persist` → **IndexedDB** (one save slot, resumes on reload)
- Local-first — no backend, no network; your run never leaves the device
- A pure, unit-tested rules core (`deck`, `effects`, `combat`) kept separate from the UI

## Project shape

```
src/
  content/majorot-content.ts   The oracle — all card meanings, spells, rules math (source of truth)
  engine/                       Pure, tested: deck.ts · effects.ts · combat.ts
  store/                        Zustand store + RunState types + IndexedDB persistence
  screens/                      Title · Founding · Play · Combat · ChapterTurn · Ending
  components/                   Meters · Card · the bound-book pieces
  styles/                       tokens.css (palette) · global.css · ui.css
prototype/                      The original single-file tracker the digital game grew from
```

## Credits

Game design, writing, and direction by **Nae** / ADHDesigns. The card oracle and rules
are Nae's own work. No licensed tarot artwork is used — cards are rendered
typographically.
