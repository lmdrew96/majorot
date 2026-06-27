import React, { useState, useEffect, useRef } from "react";

/* ============================================================
   THE MAJOROT — Witch's Ledger
   A solo-play state tracker + combat helper for The Majorot.
   Single-file React artifact. Auto-saves via window.storage.
   ============================================================ */

/* ---------- Brand tokens (ADHDesigns) ---------- */
const C = {
  olive: "#849440",
  teal: "#244952",
  gold: "#DFA649",
  purple: "#88739E",
  mint: "#8CBDB9",
  green: "#97D181",
  lavender: "#DBD5E2",
  surface: "#F7F5FA",
  ink: "#1E1830",
  white: "#FFFFFF",
};

/* ---------- The 22 Majors (reference data) ---------- */
const MAJORS = [
  { id: 0,  rn: "0",     name: "The Fool",          base: 3, atk: ["Leap", "Strike at +2 base, but take 1 Self."], eff: ["Beginner's Luck", "Choose the orientation of your next draw."] },
  { id: 1,  rn: "I",     name: "The Magician",      base: 4, atk: ["Bolt", "Clean damage — the baseline."], eff: ["Manifest", "Will one small thing into being; it's simply true."] },
  { id: 2,  rn: "II",    name: "The High Priestess",base: 3, atk: ["Hush", "Damage, and shrug off the next blow this fight."], eff: ["Scry", "Look at the top 3 cards; return them in any order."] },
  { id: 3,  rn: "III",   name: "The Empress",       base: 4, atk: ["Bloom", "Damage; if it kills, restore 1 Self."], eff: ["Nurture", "Restore 3 Self (or 2 to an ally)."] },
  { id: 4,  rn: "IV",    name: "The Emperor",       base: 5, atk: ["Dominion", "Damage; +2 vs Court threats."], eff: ["Decree", "Ward your next 2 Wounds free."] },
  { id: 5,  rn: "V",     name: "The Hierophant",    base: 4, atk: ["Anathema", "Damage; a mirror (½) channel counts as full (×1)."], eff: ["Blessing", "Your next cast costs no Spark."] },
  { id: 6,  rn: "VI",    name: "The Lovers",        base: 3, atk: ["Bond's Edge", "Damage; +2 while protecting an ally."], eff: ["Union", "Turn a Court you've met into an ally (once each)."] },
  { id: 7,  rn: "VII",   name: "The Chariot",       base: 5, atk: ["Charge", "Damage; +2 on your first cast of a fight."], eff: ["Seize", "Your fight-wins grant +2 Spark instead of +1."] },
  { id: 8,  rn: "VIII",  name: "Strength",          base: 3, atk: ["Tame", "If the threat is at half HP or less, end the fight now (win, no kill)."], eff: ["Endure", "Bear your next 3 Wounds free."] },
  { id: 9,  rn: "IX",    name: "The Hermit",        base: 3, atk: ["Lantern", "Damage; +2 if it's your only cast this fight."], eff: ["Withdraw", "Skip drawing this sitting to restore Spark to full. (your rest mechanic)"] },
  { id: 10, rn: "X",     name: "Wheel of Fortune",  base: 4, atk: ["Spin", "Flip a card (return it): upright ×2, reversed ×0."], eff: ["Fortune's Favor", "Set aside the card you just drew and draw again."] },
  { id: 11, rn: "XI",    name: "Justice",           base: 4, atk: ["Reckoning", "Damage; +1 for every Self you're currently missing."], eff: ["Balance", "Convert between Self and Spark (2 Spark ↔ 1 Self)."] },
  { id: 12, rn: "XII",   name: "The Hanged Man",    base: 2, atk: ["Suspend", "Low damage; the threat can't strike for 2 rounds."], eff: ["Surrender", "Flip any one card you've drawn this session."] },
  { id: 13, rn: "XIII",  name: "Death",             base: 7, atk: ["Reap", "Heavy damage; +4 vs a threat at half HP or less."], eff: ["Transmute", "Discard a card to reveal toward your next Major and take it. (once/chapter)"] },
  { id: 14, rn: "XIV",   name: "Temperance",        base: 3, atk: ["Alloy", "Damage; channel two elements, take the better matchup."], eff: ["Temper", "Restore 2 Self and 2 Spark."] },
  { id: 15, rn: "XV",    name: "The Devil",         base: 6, atk: ["Temptation", "+4 damage, but pay 2 Self."], eff: ["Pact", "Gain 3 Spark now; lose 3 Self at next chapter's start."] },
  { id: 16, rn: "XVI",   name: "The Tower",         base: 7, atk: ["Cataclysm", "Heavy damage; ignores matchup (even your opposite hits full)."], eff: ["Collapse", "Destroy an obstacle in your story outright; draw the cost."] },
  { id: 17, rn: "XVII",  name: "The Star",          base: 2, atk: ["Starfall", "Low damage; restore 2 Self."], eff: ["Renewal", "Restore 4 Self and flip one reversed card upright."] },
  { id: 18, rn: "XVIII", name: "The Moon",          base: 3, atk: ["Phantasm", "Damage; the threat strikes itself next round."], eff: ["Obscure", "The next reversed Minor you draw isn't a threat."] },
  { id: 19, rn: "XIX",   name: "The Sun",           base: 6, atk: ["Radiance", "Damage; +2 while above half Self."], eff: ["Daybreak", "Restore 5 Self and flip all your reversed cards upright. (once/chapter)"] },
  { id: 20, rn: "XX",    name: "Judgement",         base: 6, atk: ["Summons", "Damage; +1 for every Major-spell you've collected."], eff: ["Rise", "Restore a lost spell or ally, or un-take your last Wound."] },
  { id: 21, rn: "XXI",   name: "The World",         base: 5, atk: ["Encompass", "Damage; channel any element at ×1 (no dead matchups)."], eff: ["Completion", "Search the deck for any one Major and take it. (once/game)"] },
];

/* ---------- Elements + matchup wheel ---------- */
const ELEMENTS = [
  { key: "fire",  label: "Fire",  suit: "Wands",     faculty: "Spirit" },
  { key: "water", label: "Water", suit: "Cups",      faculty: "Emotion" },
  { key: "air",   label: "Air",   suit: "Swords",    faculty: "Mind" },
  { key: "earth", label: "Earth", suit: "Pentacles", faculty: "Body" },
];
// X beats Y (predator → prey): Water▸Fire▸Air▸Earth▸(Water)
const PREY = { water: "fire", fire: "air", air: "earth", earth: "water" };

function matchup(channel, target) {
  if (channel === target) return 0.5;       // mirror
  if (PREY[channel] === target) return 2;    // you beat them
  if (PREY[target] === channel) return 0;    // they beat you (dead)
  return 1;                                  // neutral
}
function matchupLabel(m) {
  if (m === 2) return { text: "×2 — super-effective", color: C.green };
  if (m === 1) return { text: "×1 — neutral", color: C.teal };
  if (m === 0.5) return { text: "×½ — mirror / weak", color: C.gold };
  return { text: "×0 — useless (never throw the bones here)", color: "#B4543E" };
}

/* ---------- Enemy tiers ---------- */
const ENEMIES = [
  { key: "ten",    label: "Ten — a Cresting", hp: 24, strike: 3 },
  { key: "page",   label: "Page — a Reckoning", hp: 26, strike: 3 },
  { key: "knight", label: "Knight — a Reckoning", hp: 28, strike: 4 },
  { key: "queen",  label: "Queen — a Reckoning", hp: 30, strike: 4 },
  { key: "king",   label: "King — a Reckoning", hp: 32, strike: 5 },
];

/* ---------- Kit reference ---------- */
const KIT_ITEMS = [
  { name: "The First Ember",      suit: "Wands",     keep: false, use: "+3 to any one attack." },
  { name: "The Far-Seeing Glass", suit: "Wands",     keep: false, use: "Look at the top 3 cards; reorder or leave them." },
  { name: "The Swift Arrows",     suit: "Wands",     keep: false, use: "In a fight, strike twice this round before the threat acts." },
  { name: "The Welling Cup",      suit: "Cups",      keep: true,  use: "Once per chapter, restore 2 Self." },
  { name: "The Dreaming Chalice", suit: "Cups",      keep: false, use: "Look at the next 2 cards, choose which to face; the other reshuffles." },
  { name: "The Clear Blade",      suit: "Swords",    keep: false, use: "Next attack ignores matchup (no ½, no 0)." },
  { name: "The Balance Key",      suit: "Swords",    keep: false, use: "Yield a fight at no Self cost — a clean exit." },
  { name: "The Ferryman's Token", suit: "Swords",    keep: false, use: "Skip the next threat entirely — no fight, no cost." },
  { name: "The Thief's Spyglass", suit: "Swords",    keep: false, use: "Look at top 5; take one into hand, reshuffle the rest." },
  { name: "The Loosing Key",      suit: "Swords",    keep: false, use: "End a fight, OR clear a Wound, OR break any bind." },
  { name: "The Seed-Pearl",       suit: "Pentacles", keep: true,  use: "While held, +1 Spark at the start of each chapter." },
  { name: "The Juggler's Coins",  suit: "Pentacles", keep: false, use: "Take an extra action this turn (cast twice, or cast and draw)." },
  { name: "The Mason's Mark",     suit: "Pentacles", keep: false, use: "Turn any one Court you meet into an ally automatically." },
  { name: "The Open Hand",        suit: "Pentacles", keep: false, use: "Restore 2 Self and 1 Spark." },
  { name: "The Patient Vine",     suit: "Pentacles", keep: true,  use: "Spend for +2 Self per chapter held (max +6)." },
  { name: "The Crafter's Awl",    suit: "Pentacles", keep: false, use: "Permanently raise one element stat by 1 (max 4)." },
  { name: "Charm (generic)",      suit: "—",         keep: false, use: "+2 to a cast, or ward a Wound." },
];

const ALLY_FLAVOR = {
  Wands: "+2 to a cast",
  Cups: "absorb 1 Self",
  Pentacles: "+2 Spark",
  Swords: "a redraw",
};

/* ---------- Initial state ---------- */
const blankState = () => ({
  witch: { name: "", chapterTitle: "" },
  founding: { arcana: null, birthright: null, childhood: "", currentLife: "" },
  stats: { fire: 4, water: 1, air: 2, earth: 3 },
  self: 22,
  spark: 7,
  chapter: 1,
  claimed: {},      // { [majorId]: true }
  allies: [],       // { id, name, suit, boonUsed }
  kit: [],          // { id, name }
});

const SAVE_KEY = "majorot-save-v1";

/* ---------- Storage wrapper (graceful fallback) ---------- */
async function storageGet(key) {
  try {
    if (typeof window !== "undefined" && window.storage) {
      const r = await window.storage.get(key);
      return r ? r.value : null;
    }
  } catch (e) { /* missing key or no storage */ }
  return null;
}
async function storageSet(key, value) {
  try {
    if (typeof window !== "undefined" && window.storage) {
      await window.storage.set(key, value);
    }
  } catch (e) { /* ignore */ }
}

/* ============================================================
   ROOT
   ============================================================ */
export default function MajorotTracker() {
  const [tab, setTab] = useState("sheet");
  const [state, setState] = useState(blankState);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState("");
  const firstSave = useRef(true);

  // load
  useEffect(() => {
    (async () => {
      const raw = await storageGet(SAVE_KEY);
      if (raw) {
        try { setState({ ...blankState(), ...JSON.parse(raw) }); } catch (e) {}
      }
      setLoaded(true);
    })();
  }, []);

  // auto-save (skip first run after load)
  useEffect(() => {
    if (!loaded) return;
    if (firstSave.current) { firstSave.current = false; return; }
    storageSet(SAVE_KEY, JSON.stringify(state));
  }, [state, loaded]);

  const flash = (msg) => { setToast(msg); window.clearTimeout(flash._t); flash._t = window.setTimeout(() => setToast(""), 1800); };

  const update = (patch) => setState((s) => ({ ...s, ...patch }));

  if (!loaded) {
    return <div className="mj-root" style={{ ...styles.page, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 240 }}>
      <FontStyle />
      <span style={{ color: C.teal, fontFamily: "var(--mj-body)" }}>Opening the Ledger…</span>
    </div>;
  }

  const claimedCount = Object.values(state.claimed).filter(Boolean).length;

  return (
    <div className="mj-root" style={styles.page}>
      <FontStyle />

      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.kicker}>The Majorot · Witch's Ledger</div>
          <input
            value={state.witch.name}
            onChange={(e) => update({ witch: { ...state.witch, name: e.target.value } })}
            placeholder="Name your witch…"
            style={styles.witchName}
          />
        </div>
        <div style={styles.claimBadge}>
          <span style={{ fontSize: 22, fontWeight: 600 }}>{claimedCount}</span>
          <span style={{ opacity: 0.7 }}>/22</span>
          <div style={styles.claimSub}>claimed</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={styles.tabBar} role="tablist">
        {[["sheet", "Sheet"], ["spellbook", "Spellbook"], ["combat", "Combat"]].map(([k, lbl]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{ ...styles.tab, ...(tab === k ? styles.tabActive : {}) }}
          >{lbl}</button>
        ))}
      </div>

      {tab === "sheet" && <SheetTab state={state} setState={setState} flash={flash} />}
      {tab === "spellbook" && <SpellbookTab state={state} setState={setState} flash={flash} />}
      {tab === "combat" && <CombatTab state={state} />}

      {/* Footer / save controls */}
      <div style={{ ...styles.row, justifyContent: "space-between", marginTop: 28, flexWrap: "wrap", gap: 8 }}>
        <span style={styles.metaNote}>Auto-saves as you go.</span>
        <div style={styles.row}>
          <button style={styles.btnGhost} onClick={async () => {
            try { await navigator.clipboard.writeText(JSON.stringify(state, null, 2)); flash("Save copied to clipboard"); }
            catch (e) { flash("Couldn't copy"); }
          }}>Export save</button>
          <ResetButton onReset={() => { setState(blankState()); flash("New game started"); }} />
        </div>
      </div>

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

/* ============================================================
   SHEET TAB
   ============================================================ */
function SheetTab({ state, setState, flash }) {
  const update = (patch) => setState((s) => ({ ...s, ...patch }));

  const setSelf = (v) => update({ self: clamp(v, 0, 22) });
  const setSpark = (v) => update({ spark: clamp(v, 0, 7) });

  const rest = () => {
    setState((s) => ({
      ...s,
      spark: 7,
      allies: s.allies.map((a) => ({ ...a, boonUsed: false })),
    }));
    flash("Rested — Spark refilled, allies refreshed");
  };

  const ending = endingFor(state.self);

  return (
    <div>
      {/* Meters */}
      <div style={styles.card}>
        <SectionLabel>Meters</SectionLabel>

        {/* Self */}
        <div style={{ marginBottom: 6, ...styles.row, justifyContent: "space-between" }}>
          <span style={styles.meterTitle}>Self</span>
          <span style={{ ...styles.endingPill, background: ending.bg, color: ending.fg }}>{ending.label}</span>
        </div>
        <div style={styles.row}>
          <Stepper onMinus={() => setSelf(state.self - 1)} onPlus={() => setSelf(state.self + 1)} />
          <span style={styles.bigNum}>{state.self}<span style={styles.bigNumMax}>/22</span></span>
        </div>
        <SelfBar value={state.self} onSet={setSelf} />
        <p style={styles.hint}>Gold line = half. <b>12+ Triumph</b> · <b>1–11 Bittersweet</b> · <b>0 Ruin</b>. Lost to backfires, enemy Strikes, yields, casting on empty Spark, unwarded Wounds.</p>

        {/* Spark */}
        <div style={{ marginTop: 22, marginBottom: 6 }}>
          <span style={styles.meterTitle}>Spark</span>
        </div>
        <div style={styles.row}>
          <Stepper onMinus={() => setSpark(state.spark - 1)} onPlus={() => setSpark(state.spark + 1)} />
          <span style={{ ...styles.bigNum, color: C.gold }}>{state.spark}<span style={styles.bigNumMax}>/7</span></span>
        </div>
        <SparkPips value={state.spark} onSet={setSpark} />
        <p style={styles.hint}>1 to cast · 1 to ward a Wound. Refills to 7 each chapter (Rest). Casting on empty Spark costs Self instead.</p>
      </div>

      {/* Chapter + Rest */}
      <div style={styles.card}>
        <SectionLabel>Chapter</SectionLabel>
        <div style={{ ...styles.row, justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={styles.row}>
            <Stepper onMinus={() => update({ chapter: clamp(state.chapter - 1, 1, 22) })} onPlus={() => update({ chapter: clamp(state.chapter + 1, 1, 22) })} />
            <span style={styles.bigNum}>{state.chapter}</span>
            <input
              value={state.witch.chapterTitle}
              onChange={(e) => update({ witch: { ...state.witch, chapterTitle: e.target.value } })}
              placeholder="Chapter heading…"
              style={{ ...styles.textInput, flex: 1, minWidth: 140 }}
            />
          </div>
          <button style={styles.btnPrimary} onClick={rest}>Rest · Turn the Page</button>
        </div>
        <p style={styles.hint}>Claim a Major → turn the page. Rest refills Spark to 7 and refreshes ally boons. (Self stays hard-won — mend it through cards & Mend-spells.)</p>
      </div>

      {/* Favored Magic */}
      <div style={styles.card}>
        <SectionLabel>Favored Magic</SectionLabel>
        <p style={{ ...styles.hint, marginTop: -2, marginBottom: 14 }}>Assign 4 / 3 / 2 / 1 across the elements — your best-practiced gets the 4. These set how hard you hit when you channel.</p>
        <div style={styles.statGrid}>
          {ELEMENTS.map((el) => (
            <div key={el.key} style={styles.statCell}>
              <div style={styles.statLabel}>{el.label}</div>
              <div style={styles.statSuit}>{el.suit} · {el.faculty}</div>
              <div style={{ ...styles.row, justifyContent: "center", marginTop: 6 }}>
                <Stepper
                  small
                  onMinus={() => setState((s) => ({ ...s, stats: { ...s.stats, [el.key]: clamp(s.stats[el.key] - 1, 0, 4) } }))}
                  onPlus={() => setState((s) => ({ ...s, stats: { ...s.stats, [el.key]: clamp(s.stats[el.key] + 1, 0, 4) } }))}
                />
                <span style={styles.statVal}>{state.stats[el.key]}</span>
              </div>
            </div>
          ))}
        </div>
        <StatHint stats={state.stats} />
      </div>

      {/* Allies */}
      <AlliesPanel state={state} setState={setState} flash={flash} />

      {/* Kit */}
      <KitPanel state={state} setState={setState} flash={flash} />

      {/* Founding */}
      <FoundingPanel state={state} setState={setState} flash={flash} />
    </div>
  );
}

function StatHint({ stats }) {
  const vals = [stats.fire, stats.water, stats.air, stats.earth].sort((a, b) => a - b).join("");
  const ok = vals === "1234";
  if (ok) return null;
  return <p style={{ ...styles.hint, color: C.gold }}>↳ Tip: a standard spread is 4 / 3 / 2 / 1 (one of each). Yours doesn't match — fine if intentional.</p>;
}

/* ---------- Allies ---------- */
function AlliesPanel({ state, setState, flash }) {
  const add = () => {
    if (state.allies.length >= 3) { flash("Ally cap is 3 — swap one out first"); return; }
    setState((s) => ({ ...s, allies: [...s.allies, { id: uid(), name: "", suit: "Wands", boonUsed: false }] }));
  };
  const set = (id, patch) => setState((s) => ({ ...s, allies: s.allies.map((a) => a.id === id ? { ...a, ...patch } : a) }));
  const remove = (id) => setState((s) => ({ ...s, allies: s.allies.filter((a) => a.id !== id) }));

  return (
    <div style={styles.card}>
      <div style={{ ...styles.row, justifyContent: "space-between" }}>
        <SectionLabel noMargin>Allies <span style={styles.cap}>cap 3 · {state.allies.length}/3</span></SectionLabel>
        <button style={styles.btnCalm} onClick={add} disabled={state.allies.length >= 3}>+ Ally</button>
      </div>
      <p style={{ ...styles.hint, marginTop: 8 }}>Once per chapter an ally lends a hand (flavored by suit): {Object.entries(ALLY_FLAVOR).map(([s, f], i) => <span key={s}>{i > 0 ? " · " : ""}<b>{s}</b> {f}</span>)}.</p>

      {state.allies.length === 0 && <EmptyNote>No allies yet. Every upright Court joins you automatically — add them here.</EmptyNote>}

      {state.allies.map((a) => (
        <div key={a.id} style={styles.allyRow}>
          <input value={a.name} onChange={(e) => set(a.id, { name: e.target.value })} placeholder="name" style={{ ...styles.textInput, flex: 1, minWidth: 90 }} />
          <select value={a.suit} onChange={(e) => set(a.id, { suit: e.target.value })} style={styles.select}>
            {["Wands", "Cups", "Swords", "Pentacles"].map((s) => <option key={s}>{s}</option>)}
          </select>
          <button
            onClick={() => set(a.id, { boonUsed: !a.boonUsed })}
            title={a.boonUsed ? "Boon used this chapter" : "Boon available"}
            style={{ ...styles.boonToggle, ...(a.boonUsed ? styles.boonUsed : styles.boonReady) }}
          >{a.boonUsed ? "used" : "ready"}</button>
          <button onClick={() => remove(a.id)} style={styles.iconBtn} aria-label="remove ally">×</button>
        </div>
      ))}
    </div>
  );
}

/* ---------- Kit ---------- */
function KitPanel({ state, setState, flash }) {
  const [pick, setPick] = useState("");
  const addItem = (name) => {
    if (!name) return;
    setState((s) => ({ ...s, kit: [...s.kit, { id: uid(), name }] }));
    setPick("");
    flash(`Added ${name}`);
  };
  const remove = (id) => setState((s) => ({ ...s, kit: s.kit.filter((k) => k.id !== id) }));
  const ref = (name) => KIT_ITEMS.find((k) => k.name === name);

  return (
    <div style={styles.card}>
      <SectionLabel>The Kit</SectionLabel>
      <div style={{ ...styles.row, marginBottom: 4 }}>
        <select value={pick} onChange={(e) => setPick(e.target.value)} style={{ ...styles.select, flex: 1 }}>
          <option value="">Quick-add an item…</option>
          {KIT_ITEMS.map((k) => <option key={k.name} value={k.name}>{k.name} — {k.suit}{k.keep ? " (stays)" : ""}</option>)}
        </select>
        <button style={styles.btnCalm} onClick={() => addItem(pick)} disabled={!pick}>Add</button>
      </div>

      {state.kit.length === 0 && <EmptyNote>Empty. Items and Charms come from the Pip Oracle — quick-add them here.</EmptyNote>}

      {state.kit.map((k) => {
        const r = ref(k.name);
        return (
          <div key={k.id} style={styles.kitRow}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{k.name} {r?.keep && <span style={styles.staysTag}>stays</span>}</div>
              {r && <div style={styles.kitUse}>{r.use}</div>}
            </div>
            <button onClick={() => remove(k.id)} style={styles.iconBtn} aria-label="remove item">×</button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Founding ---------- */
function FoundingPanel({ state, setState, flash }) {
  const setFound = (patch) => setState((s) => {
    const founding = { ...s.founding, ...patch };
    // claim arcana + birthright automatically
    const claimed = { ...s.claimed };
    if (founding.arcana != null) claimed[founding.arcana] = true;
    if (founding.birthright != null) claimed[founding.birthright] = true;
    return { ...s, founding, claimed };
  });

  return (
    <div style={styles.card}>
      <SectionLabel>The Founding</SectionLabel>
      <p style={{ ...styles.hint, marginTop: -2, marginBottom: 14 }}>Your two starting spells. Arcana = who you are. Birthright = what you were owed. Both auto-tick in the Spellbook.</p>

      <FoundField label="Arcana — who you are">
        <select value={state.founding.arcana ?? ""} onChange={(e) => setFound({ arcana: e.target.value === "" ? null : Number(e.target.value) })} style={{ ...styles.select, width: "100%" }}>
          <option value="">— choose Major —</option>
          {MAJORS.map((m) => <option key={m.id} value={m.id}>{m.rn} · {m.name}</option>)}
        </select>
      </FoundField>

      <FoundField label="Birthright — what you were owed">
        <select value={state.founding.birthright ?? ""} onChange={(e) => setFound({ birthright: e.target.value === "" ? null : Number(e.target.value) })} style={{ ...styles.select, width: "100%" }}>
          <option value="">— choose Major —</option>
          {MAJORS.map((m) => <option key={m.id} value={m.id}>{m.rn} · {m.name}</option>)}
        </select>
      </FoundField>

      <FoundField label="Childhood — where you came from">
        <input value={state.founding.childhood} onChange={(e) => setFound({ childhood: e.target.value })} placeholder="e.g. 10 of Cups (r) — broken home" style={{ ...styles.textInput, width: "100%" }} />
      </FoundField>

      <FoundField label="Current Life — where you are now">
        <input value={state.founding.currentLife} onChange={(e) => setFound({ currentLife: e.target.value })} placeholder="e.g. 9 of Cups (r) — out of touch with self" style={{ ...styles.textInput, width: "100%" }} />
      </FoundField>
    </div>
  );
}
function FoundField({ label, children }) {
  return <div style={{ marginBottom: 12 }}>
    <div style={styles.fieldLabel}>{label}</div>
    {children}
  </div>;
}

/* ============================================================
   SPELLBOOK TAB
   ============================================================ */
function SpellbookTab({ state, setState, flash }) {
  const [open, setOpen] = useState(null);
  const toggle = (id) => setState((s) => {
    const claimed = { ...s.claimed, [id]: !s.claimed[id] };
    return { ...s, claimed };
  });
  const count = Object.values(state.claimed).filter(Boolean).length;

  return (
    <div>
      <div style={styles.card}>
        <div style={{ ...styles.row, justifyContent: "space-between", marginBottom: 4 }}>
          <SectionLabel noMargin>The Spellbook</SectionLabel>
          <span style={styles.progressPill}>{count} of 22 — {count === 22 ? "the great working is complete" : `${22 - count} to collect`}</span>
        </div>
        <ProgressBar value={count} max={22} />
        <p style={{ ...styles.hint, marginTop: 10 }}>Tick each Major as you claim it. Tap a card to read its attack + effect. Your Founding Arcana & Birthright are starred.</p>

        <div style={styles.spellGrid}>
          {MAJORS.map((m) => {
            const claimed = !!state.claimed[m.id];
            const isFound = state.founding.arcana === m.id || state.founding.birthright === m.id;
            return (
              <div key={m.id} style={{ ...styles.spellCell, ...(claimed ? styles.spellClaimed : {}) }}>
                <button onClick={() => toggle(m.id)} style={styles.spellTick} aria-label={`claim ${m.name}`}>
                  <span style={{ ...styles.tickBox, ...(claimed ? styles.tickOn : {}) }}>{claimed ? "✓" : ""}</span>
                </button>
                <button onClick={() => setOpen(open === m.id ? null : m.id)} style={styles.spellMain}>
                  <div style={styles.spellRn}>{m.rn}{isFound && <span style={styles.foundStar}>★</span>}</div>
                  <div style={styles.spellName}>{m.name}</div>
                  <div style={styles.spellBase}>base {m.base}</div>
                </button>
                {open === m.id && (
                  <div style={styles.spellDetail}>
                    <div style={styles.spellMode}><span style={styles.modeTag}>Attack</span> <b>{m.atk[0]}</b> — {m.atk[1]}</div>
                    <div style={styles.spellMode}><span style={{ ...styles.modeTag, background: C.purple, color: C.surface }}>Effect</span> <b>{m.eff[0]}</b> — {m.eff[1]}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   COMBAT TAB
   ============================================================ */
function CombatTab({ state }) {
  const bestEl = ELEMENTS.reduce((best, el) => state.stats[el.key] > state.stats[best.key] ? el : best, ELEMENTS[0]).key;
  const [channel, setChannel] = useState(bestEl);
  const [target, setTarget] = useState("fire");
  const [base, setBase] = useState(4);
  const [enemyKey, setEnemyKey] = useState("knight");
  const enemyDef = ENEMIES.find((e) => e.key === enemyKey);
  const [hp, setHp] = useState(enemyDef.hp);
  const [bones, setBones] = useState(null);   // {roll, kind}
  const [evade, setEvade] = useState(null);   // {roll, slip}

  useEffect(() => { setHp(ENEMIES.find((e) => e.key === enemyKey).hp); setBones(null); setEvade(null); }, [enemyKey]);

  const stat = state.stats[channel];
  const m = matchup(channel, target);
  const mLabel = matchupLabel(m);
  const baseDmg = Math.floor((Number(base) + stat) * m);

  // applied damage after a bones roll
  let appliedDmg = baseDmg;
  let bonesNote = "Roll the Bones to see if it lands.";
  if (bones) {
    if (bones.kind === "backfire") { appliedDmg = 0; bonesNote = "Backfire — 0 damage. Roll again, lose half (1–3 Self). Enemy hits you automatically."; }
    else if (bones.kind === "surge") { appliedDmg = baseDmg * 2; bonesNote = `Surge — double damage (${appliedDmg}). Stacks with matchup.`; }
    else { appliedDmg = baseDmg; bonesNote = `Hit — full damage (${appliedDmg}).`; }
  }

  const rollBones = () => {
    const r = 1 + Math.floor(Math.random() * 6);
    const kind = r === 1 ? "backfire" : r === 6 ? "surge" : "hit";
    setBones({ roll: r, kind });
  };
  const rollEvade = () => {
    const r = 1 + Math.floor(Math.random() * 6);
    setEvade({ roll: r, slip: r >= 4 });
  };

  return (
    <div>
      {/* Damage calculator */}
      <div style={styles.card}>
        <SectionLabel>Channel</SectionLabel>

        <div style={styles.fieldLabel}>Your element (channel)</div>
        <ElementPicker value={channel} onChange={setChannel} stats={state.stats} showStat />

        <div style={{ ...styles.fieldLabel, marginTop: 16 }}>Enemy's element (target)</div>
        <ElementPicker value={target} onChange={setTarget} />

        <div style={{ ...styles.row, marginTop: 16, gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={styles.fieldLabel}>Spell base</div>
            <div style={styles.row}>
              <Stepper small onMinus={() => setBase((b) => clamp(Number(b) - 1, 0, 20))} onPlus={() => setBase((b) => clamp(Number(b) + 1, 0, 20))} />
              <span style={{ ...styles.statVal, minWidth: 28 }}>{base}</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={styles.fieldLabel}>Pick a claimed spell</div>
            <select onChange={(e) => e.target.value !== "" && setBase(Number(e.target.value))} value="" style={{ ...styles.select, width: "100%" }}>
              <option value="">— set base from spell —</option>
              {MAJORS.filter((mj) => state.claimed[mj.id]).map((mj) => <option key={mj.id} value={mj.base}>{mj.rn} {mj.name} (base {mj.base})</option>)}
            </select>
          </div>
        </div>

        {/* Result */}
        <div style={styles.dmgPanel}>
          <div style={{ ...styles.row, justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <span style={{ ...styles.matchupTag, color: mLabel.color, borderColor: mLabel.color }}>{mLabel.text}</span>
            <span style={styles.formula}>({base} + {stat}) × {m === 0.5 ? "½" : m} = </span>
          </div>
          <div style={styles.dmgBig}>{baseDmg}<span style={styles.dmgUnit}>dmg</span></div>
          {m === 0 && <p style={{ ...styles.hint, color: "#B4543E", marginBottom: 0 }}>Dead matchup — this channel deals nothing. Pick the element that points at the enemy.</p>}
        </div>
      </div>

      {/* Dice */}
      <div style={styles.card}>
        <SectionLabel>Cast the Bones</SectionLabel>
        <div style={{ ...styles.row, gap: 12, flexWrap: "wrap" }}>
          <button style={styles.diceBtn} onClick={rollBones}>
            {bones ? <Die n={bones.roll} /> : "🎲"}<span style={{ marginLeft: 8 }}>Roll attack</span>
          </button>
          {bones && <span style={{ ...styles.diceResult, color: bones.kind === "backfire" ? "#B4543E" : bones.kind === "surge" ? C.green : C.teal }}>
            {bones.kind === "backfire" ? "Backfire" : bones.kind === "surge" ? "Surge ×2" : "Hit"}
          </span>}
        </div>
        <p style={{ ...styles.hint, marginTop: 10 }}>{bonesNote}</p>
        <div style={styles.diceLegend}>1 backfire · 2–5 hit · 6 surge ×2</div>

        <div style={{ height: 1, background: C.lavender, margin: "16px 0" }} />

        <SectionLabel>Evade the Strike</SectionLabel>
        <div style={{ ...styles.row, gap: 12, flexWrap: "wrap" }}>
          <button style={styles.diceBtn} onClick={rollEvade}>
            {evade ? <Die n={evade.roll} /> : "🎲"}<span style={{ marginLeft: 8 }}>Roll evade</span>
          </button>
          {evade && <span style={{ ...styles.diceResult, color: evade.slip ? C.green : "#B4543E" }}>
            {evade.slip ? "Slipped it — no damage" : `Connects — lose ${enemyDef.strike} Self`}
          </span>}
        </div>
        <div style={styles.diceLegend}>4–6 slip · 1–3 connect (lose Strike)</div>
      </div>

      {/* Enemy tracker */}
      <div style={styles.card}>
        <SectionLabel>Enemy</SectionLabel>
        <select value={enemyKey} onChange={(e) => setEnemyKey(e.target.value)} style={{ ...styles.select, width: "100%", marginBottom: 12 }}>
          {ENEMIES.map((e) => <option key={e.key} value={e.key}>{e.label} — {e.hp} HP / Strike {e.strike}</option>)}
        </select>

        <div style={{ ...styles.row, justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={styles.fieldLabel}>Enemy HP</div>
            <div style={{ ...styles.bigNum, color: hp <= 0 ? C.green : C.teal }}>{Math.max(0, hp)}<span style={styles.bigNumMax}>/{enemyDef.hp}</span></div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={styles.fieldLabel}>Strike</div>
            <div style={styles.statVal}>{enemyDef.strike}</div>
          </div>
        </div>
        <ProgressBar value={Math.max(0, hp)} max={enemyDef.hp} color={hp <= enemyDef.hp / 2 ? C.gold : C.teal} />

        <div style={{ ...styles.row, gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <button style={styles.btnSecondary} onClick={() => setHp((h) => h - appliedDmg)} disabled={appliedDmg <= 0}>
            Apply {appliedDmg} dmg
          </button>
          <button style={styles.btnGhost} onClick={() => setHp((h) => h - baseDmg)} disabled={baseDmg <= 0}>−{baseDmg}</button>
          <button style={styles.btnGhost} onClick={() => { setHp(enemyDef.hp); setBones(null); setEvade(null); }}>Reset fight</button>
        </div>
        {hp <= 0 && <p style={{ ...styles.hint, color: C.green, fontWeight: 600, marginTop: 12, marginBottom: 0 }}>Enemy down — you win. +1 Spark (or a held spell's win-trigger fires). At half HP, Death's Reap (+4) and Strength's Tame come online.</p>}
        {hp > 0 && hp <= enemyDef.hp / 2 && <p style={{ ...styles.hint, color: C.gold, marginTop: 12, marginBottom: 0 }}>At half HP or less — Reap +4 and Tame are live.</p>}
      </div>
    </div>
  );
}

function ElementPicker({ value, onChange, stats, showStat }) {
  return (
    <div style={styles.elGrid}>
      {ELEMENTS.map((el) => {
        const active = value === el.key;
        return (
          <button key={el.key} onClick={() => onChange(el.key)} style={{ ...styles.elBtn, ...(active ? styles.elBtnActive : {}) }}>
            <span style={{ fontWeight: 600 }}>{el.label}</span>
            <span style={styles.elSub}>{el.suit}{showStat && stats ? ` · ${stats[el.key]}` : ""}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   SHARED UI BITS
   ============================================================ */
function SectionLabel({ children, noMargin }) {
  return <div style={{ ...styles.sectionLabel, marginBottom: noMargin ? 0 : 14 }}>{children}</div>;
}
function EmptyNote({ children }) {
  return <div style={styles.emptyNote}>{children}</div>;
}
function Stepper({ onMinus, onPlus, small }) {
  const sz = small ? styles.stepBtnSm : styles.stepBtn;
  return (
    <div style={styles.row}>
      <button onClick={onMinus} style={sz} aria-label="decrease">−</button>
      <button onClick={onPlus} style={sz} aria-label="increase">+</button>
    </div>
  );
}
function SelfBar({ value, onSet }) {
  return (
    <div style={styles.selfBar}>
      {Array.from({ length: 22 }).map((_, i) => {
        const n = i + 1;
        const filled = n <= value;
        const isHalf = n === 12;
        return (
          <button
            key={n}
            onClick={() => onSet(n === value ? n - 1 : n)}
            title={`Set Self to ${n}`}
            style={{
              ...styles.selfTick,
              background: filled ? (value <= 11 ? C.gold : C.teal) : C.lavender,
              borderLeft: isHalf ? `2px solid ${C.gold}` : "none",
            }}
          />
        );
      })}
    </div>
  );
}
function SparkPips({ value, onSet }) {
  return (
    <div style={{ ...styles.row, gap: 8, marginTop: 4 }}>
      {Array.from({ length: 7 }).map((_, i) => {
        const n = i + 1;
        const on = n <= value;
        return <button key={n} onClick={() => onSet(n === value ? n - 1 : n)} aria-label={`Spark ${n}`}
          style={{ ...styles.sparkPip, background: on ? C.gold : C.surface, borderColor: on ? C.gold : C.lavender }} />;
      })}
    </div>
  );
}
function ProgressBar({ value, max, color = C.green }) {
  const pct = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return <div style={styles.progressTrack}><div style={{ ...styles.progressFill, width: `${pct}%`, background: color }} /></div>;
}
function Die({ n }) {
  return <span style={styles.dieFace}>{["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][n - 1]}</span>;
}
function ResetButton({ onReset }) {
  const [confirm, setConfirm] = useState(false);
  if (confirm) {
    return <span style={styles.row}>
      <button style={{ ...styles.btnGhost, background: "#E9C7BF", color: "#7A2E1E" }} onClick={() => { onReset(); setConfirm(false); }}>Confirm wipe</button>
      <button style={styles.btnGhost} onClick={() => setConfirm(false)}>Cancel</button>
    </span>;
  }
  return <button style={styles.btnGhost} onClick={() => setConfirm(true)}>New game</button>;
}

/* ---------- helpers ---------- */
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function uid() { return Math.random().toString(36).slice(2, 9); }
function endingFor(self) {
  if (self <= 0) return { label: "Ruin", bg: "#E9C7BF", fg: "#7A2E1E" };
  if (self <= 11) return { label: "Bittersweet", bg: C.gold, fg: C.ink };
  return { label: "Triumph", bg: C.green, fg: C.ink };
}

/* ---------- Fonts + global vars ---------- */
function FontStyle() {
  return <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Space+Grotesk:wght@400;500;600&family=Geist+Mono:wght@400&display=swap');
    :root {
      --mj-display: 'Fraunces', Georgia, serif;
      --mj-body: 'Space Grotesk', system-ui, sans-serif;
      --mj-mono: 'Geist Mono', monospace;
    }
    .mj-root * { box-sizing: border-box; }
    .mj-root button:active { transform: scale(0.97); }
    .mj-root input::placeholder { color: #9A93A8; }
    @media (prefers-reduced-motion: reduce) {
      .mj-root *, .mj-root button:active { transition: none !important; transform: none !important; }
    }
  `}</style>;
}

/* ============================================================
   STYLES
   ============================================================ */
const heading = { fontFamily: "var(--mj-display)", fontVariationSettings: "'SOFT' 0, 'WONK' 1", color: C.ink };
const styles = {
  page: { fontFamily: "var(--mj-body)", background: C.surface, color: C.ink, padding: 16, maxWidth: 640, margin: "0 auto", lineHeight: 1.5 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 },
  kicker: { fontFamily: "var(--mj-mono)", fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", color: C.purple, marginBottom: 2 },
  witchName: { ...heading, fontSize: 28, fontWeight: 600, border: "none", background: "transparent", outline: "none", padding: 0, width: "100%" },
  claimBadge: { textAlign: "center", background: C.white, borderRadius: 16, padding: "8px 14px", boxShadow: "0px 1px 1.5px rgba(0,0,0,0.10)", color: C.teal, minWidth: 70 },
  claimSub: { fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, color: C.purple, marginTop: -2 },

  tabBar: { display: "flex", gap: 6, background: C.lavender, padding: 4, borderRadius: 9999, marginBottom: 16 },
  tab: { flex: 1, border: "none", background: "transparent", padding: "9px 8px", borderRadius: 9999, fontFamily: "var(--mj-body)", fontWeight: 500, fontSize: 15, color: C.teal, cursor: "pointer", transition: "background 0.15s" },
  tabActive: { background: C.white, color: C.ink, boxShadow: "0px 1px 1.5px rgba(0,0,0,0.10)" },

  card: { background: C.white, borderRadius: 24, boxShadow: "0px 1px 1.5px rgba(0,0,0,0.10)", padding: 20, marginBottom: 14 },
  sectionLabel: { ...heading, fontSize: 20, fontWeight: 600 },
  cap: { fontFamily: "var(--mj-mono)", fontSize: 12, color: C.purple, fontWeight: 400, marginLeft: 6 },

  row: { display: "flex", alignItems: "center", gap: 10 },
  meterTitle: { ...heading, fontSize: 18, fontWeight: 500 },
  bigNum: { ...heading, fontSize: 34, fontWeight: 600, color: C.teal, lineHeight: 1 },
  bigNumMax: { fontSize: 16, color: C.purple, fontWeight: 400, marginLeft: 2 },

  hint: { fontSize: 13, color: C.teal, opacity: 0.85, marginTop: 10, marginBottom: 0, lineHeight: 1.45 },
  metaNote: { fontSize: 12, color: C.purple, fontFamily: "var(--mj-mono)" },

  endingPill: { fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 9999 },
  selfBar: { display: "flex", gap: 2, marginTop: 12, height: 26, alignItems: "stretch" },
  selfTick: { flex: 1, border: "none", borderRadius: 3, cursor: "pointer", padding: 0, minWidth: 0 },
  sparkPip: { width: 30, height: 30, borderRadius: 9999, border: "2px solid", cursor: "pointer", padding: 0 },

  stepBtn: { width: 38, height: 38, borderRadius: 9999, border: "none", background: C.lavender, color: C.ink, fontSize: 22, lineHeight: 1, cursor: "pointer", fontWeight: 500 },
  stepBtnSm: { width: 30, height: 30, borderRadius: 9999, border: "none", background: C.lavender, color: C.ink, fontSize: 18, lineHeight: 1, cursor: "pointer" },

  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  statCell: { background: C.surface, borderRadius: 16, padding: 12, textAlign: "center" },
  statLabel: { ...heading, fontSize: 17, fontWeight: 600 },
  statSuit: { fontSize: 11, color: C.purple, fontFamily: "var(--mj-mono)" },
  statVal: { ...heading, fontSize: 26, fontWeight: 600, color: C.gold, minWidth: 24, textAlign: "center" },

  allyRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 10 },
  kitRow: { display: "flex", alignItems: "flex-start", gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.lavender}` },
  kitUse: { fontSize: 12, color: C.teal, opacity: 0.8 },
  staysTag: { fontSize: 10, background: C.mint, color: C.ink, padding: "1px 7px", borderRadius: 9999, marginLeft: 6, verticalAlign: "middle" },

  textInput: { fontFamily: "var(--mj-body)", fontSize: 15, padding: "8px 12px", borderRadius: 12, border: `1.5px solid ${C.lavender}`, background: C.surface, color: C.ink, outline: "none" },
  select: { fontFamily: "var(--mj-body)", fontSize: 14, padding: "8px 10px", borderRadius: 12, border: `1.5px solid ${C.lavender}`, background: C.surface, color: C.ink, outline: "none", cursor: "pointer" },
  fieldLabel: { fontSize: 12, fontWeight: 500, color: C.purple, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },

  boonToggle: { fontSize: 12, fontWeight: 500, padding: "6px 12px", borderRadius: 9999, border: "none", cursor: "pointer", minWidth: 56 },
  boonReady: { background: C.green, color: C.ink },
  boonUsed: { background: C.lavender, color: C.purple },
  iconBtn: { width: 32, height: 32, borderRadius: 9999, border: "none", background: C.surface, color: C.purple, fontSize: 20, cursor: "pointer", lineHeight: 1, flexShrink: 0 },

  emptyNote: { fontSize: 13, color: C.purple, background: C.surface, borderRadius: 12, padding: "12px 14px", marginTop: 10, lineHeight: 1.45 },

  // spellbook
  progressPill: { fontSize: 12, fontFamily: "var(--mj-mono)", color: C.teal },
  spellGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 },
  spellCell: { background: C.surface, borderRadius: 14, overflow: "hidden", border: `1.5px solid ${C.lavender}`, display: "flex", flexDirection: "column" },
  spellClaimed: { background: "#EDF6E8", borderColor: C.green },
  spellTick: { border: "none", background: "transparent", padding: "8px 8px 0", display: "flex", justifyContent: "flex-end", cursor: "pointer" },
  tickBox: { width: 22, height: 22, borderRadius: 6, border: `2px solid ${C.purple}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.white, fontSize: 14, fontWeight: 700 },
  tickOn: { background: C.green, borderColor: C.green, color: C.ink },
  spellMain: { border: "none", background: "transparent", textAlign: "left", padding: "2px 12px 12px", cursor: "pointer", flex: 1 },
  spellRn: { fontFamily: "var(--mj-mono)", fontSize: 12, color: C.purple, fontWeight: 600 },
  foundStar: { color: C.gold, marginLeft: 5 },
  spellName: { ...heading, fontSize: 16, fontWeight: 600, lineHeight: 1.15, marginTop: 2 },
  spellBase: { fontSize: 11, color: C.teal, fontFamily: "var(--mj-mono)", marginTop: 3 },
  spellDetail: { padding: "10px 12px", borderTop: `1px solid ${C.lavender}`, background: C.white },
  spellMode: { fontSize: 12.5, lineHeight: 1.4, marginBottom: 6, color: C.ink },
  modeTag: { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, background: C.teal, color: C.surface, padding: "1px 7px", borderRadius: 9999, marginRight: 4 },

  // combat
  elGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 },
  elBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "10px 4px", borderRadius: 12, border: `1.5px solid ${C.lavender}`, background: C.surface, color: C.ink, cursor: "pointer", fontFamily: "var(--mj-body)", fontSize: 14 },
  elBtnActive: { background: C.teal, color: C.surface, borderColor: C.teal },
  elSub: { fontSize: 10, opacity: 0.8, fontFamily: "var(--mj-mono)" },

  dmgPanel: { background: C.surface, borderRadius: 16, padding: 16, marginTop: 18 },
  matchupTag: { fontSize: 13, fontWeight: 600, padding: "4px 12px", borderRadius: 9999, border: "1.5px solid" },
  formula: { fontFamily: "var(--mj-mono)", fontSize: 14, color: C.teal },
  dmgBig: { ...heading, fontSize: 52, fontWeight: 600, color: C.teal, lineHeight: 1, marginTop: 8 },
  dmgUnit: { fontSize: 16, color: C.purple, fontWeight: 400, marginLeft: 6, fontFamily: "var(--mj-body)" },

  diceBtn: { display: "inline-flex", alignItems: "center", padding: "10px 18px", borderRadius: 9999, border: "none", background: C.teal, color: C.surface, fontSize: 16, fontWeight: 500, cursor: "pointer", fontFamily: "var(--mj-body)" },
  dieFace: { fontSize: 24, lineHeight: 1 },
  diceResult: { fontWeight: 600, fontSize: 15 },
  diceLegend: { fontFamily: "var(--mj-mono)", fontSize: 12, color: C.purple, marginTop: 8 },

  progressTrack: { height: 10, background: C.lavender, borderRadius: 9999, overflow: "hidden", marginTop: 10 },
  progressFill: { height: "100%", borderRadius: 9999, transition: "width 0.2s ease" },

  // buttons
  btnPrimary: { background: C.gold, color: C.ink, border: "none", borderRadius: 9999, padding: "11px 20px", fontFamily: "var(--mj-body)", fontWeight: 500, fontSize: 15, cursor: "pointer" },
  btnSecondary: { background: C.teal, color: C.surface, border: "none", borderRadius: 9999, padding: "10px 18px", fontFamily: "var(--mj-body)", fontWeight: 500, fontSize: 14, cursor: "pointer" },
  btnCalm: { background: C.mint, color: C.ink, border: "none", borderRadius: 9999, padding: "9px 16px", fontFamily: "var(--mj-body)", fontWeight: 500, fontSize: 14, cursor: "pointer" },
  btnGhost: { background: C.lavender, color: C.ink, border: "none", borderRadius: 9999, padding: "9px 16px", fontFamily: "var(--mj-body)", fontWeight: 500, fontSize: 14, cursor: "pointer" },

  toast: { position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: C.ink, color: C.surface, padding: "10px 20px", borderRadius: 9999, fontSize: 14, fontFamily: "var(--mj-body)", boxShadow: "0px 10px 15px rgba(0,0,0,0.2)", zIndex: 50 },
};
