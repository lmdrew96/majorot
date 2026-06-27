export function HpBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const low = value <= max / 2;
  return (
    <div className="mj-hpbar" role="img" aria-label={`${value} of ${max} HP`}>
      <div className={`mj-hpbar__fill ${low ? "is-low" : ""}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
