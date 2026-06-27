import { useMemo, useState } from "react";
import { useGame } from "@/store/game";
import type { CurrentDraw } from "@/store/types";
import { ALLY_BOON } from "@/content/majorot-content";
import { Card } from "@/components/Card";
import { Meters } from "@/components/Meters";
import { EffectBadges } from "@/components/EffectBadges";
import { effectNeeds, canWard } from "@/engine/effects";
import { effectLabel } from "@/lib/effectLabel";

export function PlayScreen() {
  const witch = useGame((s) => s.witch);
  const chapter = useGame((s) => s.chapter);
  const deckLen = useGame((s) => s.deck.length);
  const self = useGame((s) => s.self);
  const spark = useGame((s) => s.spark);
  const claimed = useGame((s) => s.claimed);
  const current = useGame((s) => s.current);
  const draw = useGame((s) => s.draw);

  const spellCount = claimed.length;

  return (
    <div className="mj-app">
      <div className="mj-shell mj-play">
        <header className="mj-playhead">
          <div>
            <p className="mj-eyebrow">Chapter {chapter}</p>
            <h1 className="mj-playhead__witch">{witch}</h1>
          </div>
          <div className="mj-playhead__counts">
            <span className="mj-count">
              <strong>{spellCount}</strong>
              <em>/22 spells</em>
            </span>
            <span className="mj-count">
              <strong>{deckLen}</strong>
              <em>in deck</em>
            </span>
          </div>
        </header>

        <Meters self={self} spark={spark} />

        {current ? <Resolver current={current} /> : <DrawPanel onDraw={draw} deckLen={deckLen} />}

        <Codex />
      </div>
    </div>
  );
}

/* --- draw ----------------------------------------------------------------- */
function DrawPanel({ onDraw, deckLen }: { onDraw: () => void; deckLen: number }) {
  return (
    <div className="mj-panel mj-draw">
      <p className="mj-draw__hint">The deck waits. Turn the next card and meet what it brings.</p>
      <button className="mj-btn mj-draw__btn" onClick={onDraw} disabled={deckLen === 0}>
        {deckLen === 0 ? "The deck is spent" : "Draw a card"}
      </button>
    </div>
  );
}

/* --- resolver routing ----------------------------------------------------- */
function Resolver({ current }: { current: CurrentDraw }) {
  const res = current.resolution;
  switch (res.route) {
    case "scene":
      return <SceneResolver current={current} />;
    case "ally":
      return <AllyResolver current={current} />;
    case "claimSpell":
      return <ClaimResolver current={current} />;
    default:
      return null; // fight is handled by the combat phase
  }
}

/* --- scene ---------------------------------------------------------------- */
function SceneResolver({ current }: { current: CurrentDraw }) {
  const res = current.resolution;
  const scene = res.route === "scene" ? res : null;

  const allies = useGame((s) => s.allies);
  const spark = useGame((s) => s.spark);
  const kit = useGame((s) => s.kit);
  const commitScene = useGame((s) => s.commitScene);

  const [text, setText] = useState("");
  const [allyName, setAllyName] = useState("");
  const [allyTargetId, setAllyTargetId] = useState<string>("");
  const [warded, setWarded] = useState(false);

  const effects = scene?.effects ?? [];
  const needs = useMemo(() => effectNeeds(effects, allies), [effects, allies]);
  const [dropIndex, setDropIndex] = useState(() =>
    Math.max(0, effects.findIndex((e) => e.kind === "self")),
  );

  if (!scene) return null;
  const wardable = scene.wound && canWard({ spark, kit });

  const commit = () => {
    commitScene({
      playerText: text,
      allyName: needs.needsAllyName ? allyName : undefined,
      allyTargetId: needs.allyChoice ? allyTargetId || needs.allyChoice.candidates[0]?.id : undefined,
      ward: warded ? { dropIndex } : null,
    });
  };

  return (
    <div className={`mj-panel mj-resolve ${scene.wound ? "mj-resolve--wound" : "mj-resolve--scene"}`}>
      <div className="mj-resolve__card">
        <Card drawn={current.drawn} size="lg" />
      </div>

      <p className="mj-eyebrow">{scene.wound ? "A Wound" : "A Scene"}</p>
      <p className="mj-resolve__situation">{scene.situation}</p>

      <div className="mj-resolve__effects">
        <EffectBadges effects={scene.effects} />
      </div>

      {scene.wound && wardable && (
        <div className="mj-ward">
          <label className="mj-check">
            <input type="checkbox" checked={warded} onChange={(e) => setWarded(e.target.checked)} />
            <span>
              Ward this Wound — spend {spark > 0 ? "1 Spark" : "a Charm"} to cancel one effect
            </span>
          </label>
          {warded && scene.effects.length > 1 && (
            <div className="mj-ward__pick">
              <span className="mj-eyebrow">Cancel which?</span>
              {scene.effects.map((e, i) => (
                <label key={i} className="mj-radio">
                  <input
                    type="radio"
                    name="ward-drop"
                    checked={dropIndex === i}
                    onChange={() => setDropIndex(i)}
                  />
                  <span>{effectLabel(e).text}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {needs.needsAllyName && (
        <input
          className="mj-input"
          value={allyName}
          onChange={(e) => setAllyName(e.target.value)}
          placeholder="Name the ally who joins…"
        />
      )}

      {needs.allyChoice && (
        <label className="mj-field">
          <span className="mj-eyebrow">
            {needs.allyChoice.op === "strain" ? "Whose aid goes cold?" : "Who do you lose?"}
          </span>
          <select
            className="mj-select"
            value={allyTargetId || needs.allyChoice.candidates[0]?.id}
            onChange={(e) => setAllyTargetId(e.target.value)}
          >
            {needs.allyChoice.candidates.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <p className="mj-resolve__prompt">{scene.prompt}</p>
      <textarea
        className="mj-journal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write the scene…"
        rows={6}
        autoFocus
      />

      <button className="mj-btn mj-resolve__commit" onClick={commit}>
        Commit to the journal
      </button>
    </div>
  );
}

/* --- ally ----------------------------------------------------------------- */
function AllyResolver({ current }: { current: CurrentDraw }) {
  const res = current.resolution;
  const commitAlly = useGame((s) => s.commitAlly);
  const [name, setName] = useState("");
  const [text, setText] = useState("");

  if (res.route !== "ally") return null;
  const boon = ALLY_BOON[res.suit];

  return (
    <div className="mj-panel mj-resolve mj-resolve--ally">
      <div className="mj-resolve__card">
        <Card drawn={current.drawn} size="lg" />
      </div>

      <p className="mj-eyebrow">An ally enters</p>
      <p className="mj-resolve__boon">
        <strong>{boon.label}</strong> — {boon.effect} <em>(once per chapter)</em>
      </p>

      <input
        className="mj-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name them…"
        autoFocus
      />

      <p className="mj-resolve__prompt">{res.prompt}</p>
      <textarea
        className="mj-journal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Introduce them — face, voice, why they stand with you…"
        rows={5}
      />

      <button className="mj-btn mj-resolve__commit" onClick={() => commitAlly({ name, playerText: text })}>
        Welcome them
      </button>
    </div>
  );
}

/* --- claim spell ---------------------------------------------------------- */
function ClaimResolver({ current }: { current: CurrentDraw }) {
  const res = current.resolution;
  const commitClaim = useGame((s) => s.commitClaim);
  const [text, setText] = useState("");

  if (res.route !== "claimSpell") return null;
  const m = res.major;

  return (
    <div className="mj-panel mj-resolve mj-resolve--spell">
      <div className="mj-resolve__card">
        <Card drawn={current.drawn} size="lg" />
      </div>

      <p className="mj-eyebrow">A spell surfaces — claimed</p>
      <h2 className="mj-resolve__spellname">
        {m.roman} · {m.name}
      </h2>
      <div className="mj-spellmodes">
        <p>
          <span className="mj-tag mj-tag--attack">Attack</span> <strong>{m.attack.name}</strong> —{" "}
          {m.attack.text}
        </p>
        <p>
          <span className="mj-tag mj-tag--effect">Effect</span> <strong>{m.effect.name}</strong> —{" "}
          {m.effect.text}
        </p>
      </div>

      <p className="mj-resolve__prompt">{res.reflection}</p>
      <textarea
        className="mj-journal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Reflect — this closes the chapter…"
        rows={6}
        autoFocus
      />

      <button className="mj-btn mj-resolve__commit" onClick={() => commitClaim({ playerText: text })}>
        Claim &amp; turn the page
      </button>
    </div>
  );
}

/* --- codex (spellbook / allies / kit) ------------------------------------- */
function Codex() {
  const claimed = useGame((s) => s.claimed);
  const allies = useGame((s) => s.allies);
  const kit = useGame((s) => s.kit);

  return (
    <details className="mj-codex">
      <summary className="mj-codex__summary">
        Your Codex — {claimed.length} spells · {allies.length} allies · {kit.length} in Kit
      </summary>

      <div className="mj-codex__body">
        <section>
          <h3 className="mj-codex__head">Allies</h3>
          {allies.length === 0 && <p className="mj-note">No allies yet.</p>}
          <ul className="mj-codex__list">
            {allies.map((a) => (
              <li key={a.id}>
                <strong>{a.name}</strong> · {a.suit}
                {a.strained && <span className="mj-pill mj-pill--warn">strained</span>}
                {a.boonUsed && <span className="mj-pill">boon used</span>}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="mj-codex__head">The Kit</h3>
          {kit.length === 0 && <p className="mj-note">Empty.</p>}
          <ul className="mj-codex__list">
            {kit.map((k) => (
              <li key={k.id}>
                <strong>{k.name}</strong>
                {k.stays && <span className="mj-pill">stays</span>}
                <span className="mj-codex__use">{k.use}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </details>
  );
}
