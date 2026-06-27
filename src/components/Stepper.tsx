interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (next: number) => void;
  small?: boolean;
  ariaLabel?: string;
}

/** A −/value/+ control. Ported + TS-ified from the tracker. */
export function Stepper({ value, min = 0, max = 99, onChange, small, ariaLabel }: StepperProps) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <div className={`mj-stepper ${small ? "is-small" : ""}`} role="group" aria-label={ariaLabel}>
      <button
        type="button"
        className="mj-stepper__btn"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label="decrease"
      >
        −
      </button>
      <span className="mj-stepper__val">{value}</span>
      <button
        type="button"
        className="mj-stepper__btn"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label="increase"
      >
        +
      </button>
    </div>
  );
}
