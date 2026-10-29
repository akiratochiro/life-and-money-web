import { digitsToInt, formatBasisPoints } from "../lib/money";

const MAX_BASIS_POINTS = 10_000;

type Props = {
  basisPoints: number;
  onChange: (basisPoints: number) => void;
  label: string;
};

export function PercentInput({ basisPoints, onChange, label }: Props) {
  return (
    <label className="flex flex-col items-center gap-2">
      <span className="text-sm font-semibold text-text-muted">{label}</span>
      <span className="flex items-baseline justify-center gap-1">
        <input
          inputMode="numeric"
          autoComplete="off"
          value={formatBasisPoints(basisPoints)}
          onChange={(event) => onChange(digitsToInt(event.target.value, MAX_BASIS_POINTS))}
          className="w-40 bg-transparent text-right font-display text-5xl font-bold tracking-tight tabular-nums text-text outline-none"
        />
        <span aria-hidden="true" className="font-display text-3xl font-semibold text-text-muted">%</span>
      </span>
    </label>
  );
}