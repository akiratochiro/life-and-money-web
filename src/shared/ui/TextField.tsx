import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function TextField({ label, error, ...props }: Props) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-semibold text-text-muted">{label}</span>
      <input
        {...props}
        aria-invalid={error ? true : undefined}
        className="h-14 rounded-2xl border border-line bg-ink-800 px-4 text-base text-text outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/30 aria-invalid:border-danger"
      />
      {error && <span className="text-sm font-semibold text-danger">{error}</span>}
    </label>
  );
}