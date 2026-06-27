import { useEffect, useState } from "react";
import { useGame, type FoundingCommit } from "@/store/game";
import { MAJORS, type DrawnCard, type Element } from "@/content/majorot-content";
import { ELEMENT_META } from "@/content/majorot-content";
import { cardLabel } from "@/engine/deck";
import { Card } from "@/components/Card";
import { Stepper } from "@/components/Stepper";
import type { JournalEntry, Stats } from "@/store/types";

type NewEntry = Omit<JournalEntry, "id" | "chapter" | "ts">;

const ELEMENT_ORDER: Element[] = ["fire", "water", "air", "earth"];

const majorDrawn = (m: { majorId: number; orientation: DrawnCard["orientation"] }): DrawnCard => ({
  type: "major",
  majorId: m.majorId,
  orientation: m.orientation,
});

/** The four founding prompts (Build-spec §12 framing). */
const PROMPTS = {
  arcana: "Your Arcana — who you are at root. Write the truth this card tells about your witch.",
  birthright: "Your Birthright — what you were owed, for good or ill. Write what you inherited.",
  childhood: "Childhood — where you came from. Write the world that shaped you.",
  currentLife: "Current Life — where you stand now, as the work begins.",
} as const;

const isStandardSpread = (s: Stats): boolean =>
  [s.fire, s.water, s.air, s.earth].sort().join("") === "1234";

export function FoundingScreen() {
  const founding = useGame((s) => s.founding);
  const rollFounding = useGame((s) => s.rollFounding);
  const commitFounding = useGame((s) => s.commitFounding);

  const [step, setStep] = useState(0);
  const [witchName, setWitchName] = useState("");
  const [stats, setStats] = useState<Stats>({ fire: 4, water: 3, air: 2, earth: 1 });
  const [texts, setTexts] = useState({
    arcana: "",
    birthright: "",
    childhood: "",
    currentLife: "",
  });

  // Draw the founding cards once, on entry.
  useEffect(() => {
    if (!founding.arcana) rollFounding();
  }, [founding.arcana, rollFounding]);

  if (!founding.arcana || !founding.birthright || !founding.childhood || !founding.currentLife) {
    return (
      <div className="mj-app">
        <div className="mj-shell mj-center">
          <p className="mj-loading">Shuffling the deck…</p>
        </div>
      </div>
    );
  }

  const arcanaSpell = MAJORS[founding.arcana.majorId];
  const birthrightSpell = MAJORS[founding.birthright.majorId];

  const setText = (k: keyof typeof texts, v: string) =>
    setTexts((t) => ({ ...t, [k]: v }));

  const finish = () => {
    const entries: NewEntry[] = [
      {
        cardLabel: cardLabel(majorDrawn(founding.arcana!)),
        route: "scene",
        prompt: PROMPTS.arcana,
        playerText: texts.arcana,
        orientation: founding.arcana!.orientation,
        effectsApplied: [],
        tags: ["founding", "arcana"],
      },
      {
        cardLabel: cardLabel(majorDrawn(founding.birthright!)),
        route: "scene",
        prompt: PROMPTS.birthright,
        playerText: texts.birthright,
        orientation: founding.birthright!.orientation,
        effectsApplied: [],
        tags: ["founding", "birthright"],
      },
      {
        cardLabel: cardLabel(founding.childhood!),
        route: "scene",
        prompt: PROMPTS.childhood,
        playerText: texts.childhood,
        orientation: founding.childhood!.orientation,
        effectsApplied: [],
        tags: ["founding", "childhood"],
      },
      {
        cardLabel: cardLabel(founding.currentLife!),
        route: "scene",
        prompt: PROMPTS.currentLife,
        playerText: texts.currentLife,
        orientation: founding.currentLife!.orientation,
        effectsApplied: [],
        tags: ["founding", "current-life"],
      },
    ];
    const payload: FoundingCommit = { witchName, stats, entries };
    commitFounding(payload);
  };

  const total = 7;
  const next = () => setStep((s) => Math.min(total - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="mj-app">
      <div className="mj-shell mj-founding">
        <ProgressDots step={step} total={total} />

        {step === 0 && (
          <StepCard eyebrow="The Founding" title="Before the work begins">
            <p className="mj-prose">
              Four cards shape your witch: an <strong>Arcana</strong> (who you are) and a{" "}
              <strong>Birthright</strong> (what you were owed) become your first two spells; a{" "}
              <strong>Childhood</strong> and a <strong>Current Life</strong> are read, then returned
              to the deck. Then you name yourself and choose your Favored Magic.
            </p>
            <p className="mj-note">The cards are already drawn. Meet them one at a time.</p>
            <NavRow onNext={next} nextLabel="Meet your Arcana" />
          </StepCard>
        )}

        {step === 1 && (
          <FoundCardStep
            eyebrow="Arcana · who you are"
            drawn={majorDrawn(founding.arcana)}
            spellLine={`Starting spell — ${arcanaSpell.attack.name} / ${arcanaSpell.effect.name}`}
            prompt={PROMPTS.arcana}
            value={texts.arcana}
            onChange={(v) => setText("arcana", v)}
            onNext={next}
            onBack={back}
          />
        )}

        {step === 2 && (
          <FoundCardStep
            eyebrow="Birthright · what you were owed"
            drawn={majorDrawn(founding.birthright)}
            spellLine={`Starting spell — ${birthrightSpell.attack.name} / ${birthrightSpell.effect.name}`}
            prompt={PROMPTS.birthright}
            value={texts.birthright}
            onChange={(v) => setText("birthright", v)}
            onNext={next}
            onBack={back}
          />
        )}

        {step === 3 && (
          <FoundCardStep
            eyebrow="Childhood · where you came from"
            drawn={founding.childhood}
            prompt={PROMPTS.childhood}
            value={texts.childhood}
            onChange={(v) => setText("childhood", v)}
            onNext={next}
            onBack={back}
          />
        )}

        {step === 4 && (
          <FoundCardStep
            eyebrow="Current Life · where you stand"
            drawn={founding.currentLife}
            prompt={PROMPTS.currentLife}
            value={texts.currentLife}
            onChange={(v) => setText("currentLife", v)}
            onNext={next}
            onBack={back}
          />
        )}

        {step === 5 && (
          <StepCard eyebrow="Favored Magic" title="Where your power runs deep">
            <p className="mj-prose">
              Assign <strong>4 / 3 / 2 / 1</strong> across the elements — your best-practiced craft
              gets the 4. These set how hard you hit when you channel that element.
            </p>
            <div className="mj-statgrid">
              {ELEMENT_ORDER.map((el) => (
                <div key={el} className="mj-statcell">
                  <div className="mj-statcell__name">{el}</div>
                  <div className="mj-statcell__sub">
                    {ELEMENT_META[el].suit} · {ELEMENT_META[el].faculty}
                  </div>
                  <Stepper
                    small
                    value={stats[el]}
                    min={0}
                    max={4}
                    onChange={(v) => setStats((s) => ({ ...s, [el]: v }))}
                    ariaLabel={`${el} stat`}
                  />
                </div>
              ))}
            </div>
            {!isStandardSpread(stats) && (
              <p className="mj-note mj-note--warn">
                A standard spread is 4 / 3 / 2 / 1 — one of each. Yours differs (fine if intended).
              </p>
            )}
            <NavRow onBack={back} onNext={next} nextLabel="Name yourself" />
          </StepCard>
        )}

        {step === 6 && (
          <StepCard eyebrow="The naming" title="Who are you?">
            <input
              className="mj-input mj-input--name"
              value={witchName}
              onChange={(e) => setWitchName(e.target.value)}
              placeholder="Name your witch…"
              autoFocus
            />
            <p className="mj-note">
              You begin with <strong>22 Self</strong>, <strong>7 Spark</strong>, two spells, and a
              76-card deck. The work awaits.
            </p>
            <div className="mj-row mj-founding__finish">
              <button className="mj-btn mj-btn--ghost" onClick={back}>
                Back
              </button>
              <button className="mj-btn" onClick={finish} disabled={!witchName.trim()}>
                Begin the working
              </button>
            </div>
          </StepCard>
        )}
      </div>
    </div>
  );
}

/* --- pieces --------------------------------------------------------------- */
function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="mj-dots" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`mj-dot ${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`} />
      ))}
    </div>
  );
}

function StepCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mj-panel mj-step">
      <p className="mj-eyebrow">{eyebrow}</p>
      <h2 className="mj-step__title">{title}</h2>
      {children}
    </div>
  );
}

function NavRow({
  onBack,
  onNext,
  nextLabel,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
}) {
  return (
    <div className="mj-row mj-step__nav">
      {onBack && (
        <button className="mj-btn mj-btn--ghost" onClick={onBack}>
          Back
        </button>
      )}
      <button className="mj-btn" onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  );
}

function FoundCardStep({
  eyebrow,
  drawn,
  spellLine,
  prompt,
  value,
  onChange,
  onNext,
  onBack,
}: {
  eyebrow: string;
  drawn: DrawnCard;
  spellLine?: string;
  prompt: string;
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mj-panel mj-step">
      <p className="mj-eyebrow">{eyebrow}</p>
      <div className="mj-step__card">
        <Card drawn={drawn} size="lg" />
      </div>
      {spellLine && <p className="mj-step__spell">{spellLine}</p>}
      <p className="mj-resolve__prompt">{prompt}</p>
      <textarea
        className="mj-journal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write as much or as little as you like…"
        rows={5}
      />
      <NavRow onBack={onBack} onNext={onNext} nextLabel="Continue" />
    </div>
  );
}
