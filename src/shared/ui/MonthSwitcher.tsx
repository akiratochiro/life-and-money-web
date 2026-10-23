import { addMonths, monthLabel } from "../lib/dates";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

type Props = { month: string; onChange: (month: string) => void };

export function MonthSwitcher({ month, onChange }: Props) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-full bg-surface p-1">
      <button
        type="button"
        aria-label="Mês anterior"
        onClick={() => onChange(addMonths(month, -1))}
        className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-ink-800 active:scale-95"
      >
        <ChevronLeftIcon />
      </button>
      <span aria-live="polite" className="font-display text-sm font-semibold">
        {monthLabel(month)}
      </span>
      <button
        type="button"
        aria-label="Próximo mês"
        onClick={() => onChange(addMonths(month, 1))}
        className="flex h-11 w-11 items-center justify-center rounded-full transition hover:bg-ink-800 active:scale-95"
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
}