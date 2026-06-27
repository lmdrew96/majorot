import { useState } from "react";
import { useGame } from "@/store/game";
import { matchup, MAJORS, type Element } from "@/content/majorot-content";
import { attackPreview, matchupText, matchupTone } from "@/engine/combat";
import { Meters } from "@/components/Meters";
import { Die } from "@/components/Die";
import { HpBar } from "@/components/HpBar";

const ELEMENT_ORDER: Element[] = ["fire", "water", "air", "earth"];

const OUTCOME_COPY: Record<string, { title: string; line: string; cls: string }> = {
  won: { title: "The threat falls", line: "You stand. +1 Spark.", cls: "won" },
  yielded: { title: "You yield", line: "A step back, not a fall — the threat passes.", cls: "yielded" },
  lost: { title: "You fall", line: "The work consumed you here.", cls: "lost" },
};

export function CombatScreen() {
  const combat = useGame((s) => s.combat);
  const current = useGame((s) => s.current);
  const self = useGame((s) => s.self);
  const spark = useGame((s) => s.spark);
  const stats = useGame((s) => s.stats);
  const claimed = useGame((s) => s.claimed);

  const setChannel = useGame((s) => s.combatSetChannel);
  const setSpell = useGame((s) => s.combatSetSpell);
  const castBones = useGame((s) => s.combatCastBones);
  const evade = useGame((s) => s.combatEvade);
  const yieldFight = useGame((s) => s.combatYield);
  const record = useGame((s) => s.combatRecord);

  const [text, setText] = useState("");

  if (!combat || !current) return null;
  const c = combat;

  const stat = stats[c.channel];
  const spellBase = c.spellMajorId != null ? MAJORS[c.spellMajorId].base : 2;
  const preview = attackPreview(spellBase, stat, c.channel, c.enemyElement);
  const resolved = c.outcome !== "ongoing";
  const outcome = resolved ? OUTCOME_COPY[c.outcome] : null;
  const claimedSpells = claimed.map((cl) => MAJORS[cl.majorId]);

  return (
    <div className="mj-app">
      <div className="mj-shell mj-combat">
        <Meters self={self} spark={spark} />

        <div className="mj-panel mj-combat__panel">
          {/* Enemy header */}
          <div className="mj-combat__enemyhead">
            <div>
              <p className="mj-eyebrow">Round {c.round}</p>
              <h2 className="mj-combat__enemyname">{c.enemyLabel}</h2>
              <p className="mj-combat__enemymeta">
                element <strong>{c.enemyElement}</strong> · Strike {c.strike}
              </p>
            </div>
            <div className="mj-combat__hp">
              <span className="mj-combat__hpnum">
                {c.enemyHp}
                <em>/{c.enemyMaxHp}</em>
              </span>
              <HpBar value={c.enemyHp} max={c.enemyMaxHp} />
            </div>
          </div>

          {!resolved && c.step === "attack" && (
            <div className="mj-combat__turn">
              <p className="mj-eyebrow">Channel your element</p>
              <div className="mj-elgrid">
                {ELEMENT_ORDER.map((el) => {
                  const m = matchup(el, c.enemyElement);
                  return (
                    <button
                      key={el}
                      className={`mj-elbtn ${c.channel === el ? "is-active" : ""}`}
                      onClick={() => setChannel(el)}
                    >
                      <span className="mj-elbtn__name">{el}</span>
                      <span className="mj-elbtn__stat">stat {stats[el]}</span>
                      <span className={`mj-elbtn__m mj-elbtn__m--${matchupTone(m)}`}>
                        {m === 0.5 ? "×½" : `×${m}`}
                      </span>
                    </button>
                  );
                })}
              </div>

              <label className="mj-field">
                <span className="mj-eyebrow">Cast which spell</span>
                <select
                  className="mj-select"
                  value={c.spellMajorId ?? ""}
                  onChange={(e) => setSpell(e.target.value === "" ? null : Number(e.target.value))}
                >
                  <option value="">Unfocused cast — base 2</option>
                  {claimedSpells.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.roman} · {m.name} (base {m.base})
                    </option>
                  ))}
                </select>
              </label>

              <div className="mj-combat__preview">
                <span className={`mj-mchip mj-mchip--${matchupTone(preview.multiplier)}`}>
                  {matchupText(preview.multiplier)}
                </span>
                <span className="mj-combat__formula">
                  ({spellBase} + {stat}) × {preview.multiplier === 0.5 ? "½" : preview.multiplier} ={" "}
                  <strong>{preview.damage}</strong>
                </span>
              </div>

              <div className="mj-row mj-combat__actions">
                <button className="mj-btn" onClick={castBones}>
                  <Die n={c.lastBones?.roll ?? null} /> Cast the Bones
                </button>
                <button className="mj-btn mj-btn--ghost" onClick={yieldFight}>
                  Yield · −1 Self
                </button>
              </div>
              <p className="mj-note">1 backfire · 2–5 hit · 6 surge ×2. Each cast spends 1 Spark.</p>
            </div>
          )}

          {!resolved && c.step === "defend" && (
            <div className="mj-combat__turn">
              <p className="mj-eyebrow">The {c.enemyLabel} answers</p>
              {c.pendingFreeHit ? (
                <p className="mj-prose">A backfire has left you open — there's no slipping this one.</p>
              ) : (
                <p className="mj-prose">Roll to slip the Strike (4–6 slips · 1–3 connects for {c.strike}).</p>
              )}
              <div className="mj-row mj-combat__actions">
                <button className="mj-btn" onClick={evade}>
                  <Die n={c.lastEvade?.roll ?? null} /> {c.pendingFreeHit ? "Take the hit" : "Evade"}
                </button>
                <button className="mj-btn mj-btn--ghost" onClick={yieldFight}>
                  Yield · −1 Self
                </button>
              </div>
            </div>
          )}

          {resolved && outcome && (
            <div className={`mj-combat__resolved mj-combat__resolved--${outcome.cls}`}>
              <h3 className="mj-combat__resolvedtitle">{outcome.title}</h3>
              <p className="mj-combat__resolvedline">{outcome.line}</p>
              <p className="mj-resolve__prompt">{c.prompt}</p>
              <textarea
                className="mj-journal"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write the confrontation — who they were, and what it cost…"
                rows={5}
                autoFocus
              />
              <button className="mj-btn mj-resolve__commit" onClick={() => record(text)}>
                Record &amp; continue
              </button>
            </div>
          )}

          {/* Combat log */}
          <CombatLog lines={c.log} />
        </div>
      </div>
    </div>
  );
}

function CombatLog({ lines }: { lines: string[] }) {
  const recent = lines.slice(-7);
  return (
    <details className="mj-combat__log" open>
      <summary className="mj-codex__summary">Combat log</summary>
      <ul className="mj-combat__loglist">
        {recent.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </details>
  );
}
