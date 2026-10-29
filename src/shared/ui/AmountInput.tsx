import { digitsToInt, formatCents } from "../lib/money";

const MAX_CENTS = 99_999_999_999;

type Props = {
  cents: number;
  onChange: (cents: number) => void;
  label: string;
};

export function AmountInput({ cents, onChange, label }: Props) {
  return (
    <label className="flex flex-col items-center gap-2">
      <span className="text-sm font-semibold text-text-muted">{label}</span>
      <input
        inputMode="numeric"
        autoComplete="off"
        value={formatCents(cents)}
        onChange={(event) => onChange(digitsToInt(event.target.value, MAX_CENTS))}
        className="w-full bg-transparent text-center font-display text-5xl font-bold tracking-tight tabular-nums text-text outline-none"
      />
    </label>
  );
}