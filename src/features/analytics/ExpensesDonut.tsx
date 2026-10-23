import { useState } from "react";
import type { ExpensesByCategory } from "./analyticsApi";
import { Money } from "../../shared/ui/Money";
import { toCents } from "../../shared/lib/money";

const PALETTE = ["#ff7a45", "#ffb020", "#ff4d6d", "#ffd08a", "#c9546f", "#ff9a6b"];
const OTHERS_COLOR = "#4a5480";
const MAX_SLICES = PALETTE.length;

type Slice = { key: string; name: string; cents: number; percentage: number; color: string };

const percentFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

function toSlices(data: ExpensesByCategory): Slice[] {
  const categories = data.categories ?? [];
  const fitsAll = categories.length <= MAX_SLICES;
  const shown = fitsAll ? categories : categories.slice(0, MAX_SLICES - 1);

  const slices: Slice[] = shown.map((category, index) => ({
    key: String(category.categoryId),
    name: category.name ?? "",
    cents: toCents(category.total ?? 0),
    percentage: category.percentage ?? 0,
    color: PALETTE[index],
  }));

  if (!fitsAll) {
    const rest = categories.slice(MAX_SLICES - 1);
    slices.push({
      key: "others",
      name: `Outras (${rest.length})`,
      cents: rest.reduce((sum, category) => sum + toCents(category.total ?? 0), 0),
      percentage: rest.reduce((sum, category) => sum + (category.percentage ?? 0), 0),
      color: OTHERS_COLOR,
    });
  }
  return slices;
}

type Arc = Slice & { length: number; start: number };

function buildArcs(slices: Slice[], circumference: number): Arc[] {
  const arcs: Arc[] = [];
  let start = 0;
  for (const slice of slices) {
    const length = (slice.percentage / 100) * circumference;
    arcs.push({ ...slice, length, start });
    start += length;
  }
  return arcs;
}

export function ExpensesDonut({ data }: { data: ExpensesByCategory }) {
  const [selected, setSelected] = useState<string | null>(null);
  const slices = toSlices(data);

  if (slices.length === 0) {
    return <p className="text-sm text-text-soft">Nenhum gasto registrado neste mês.</p>;
  }

  const size = 200;
  const stroke = 26;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const gap = slices.length > 1 ? 4 : 0;

    const arcs = buildArcs(slices, circumference);

  const active = slices.find((slice) => slice.key === selected);
  const summary = slices.map((slice) => `${slice.name}, ${percentFormat.format(slice.percentage)}%`).join("; ");

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          role="img"
          aria-label={`Gastos por categoria: ${summary}`}
        >
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-track)" strokeWidth={stroke} />
          {arcs.map((arc) => {
            const dimmed = selected !== null && selected !== arc.key;
            return (
              <circle
                key={arc.key}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={dimmed ? stroke - 10 : stroke}
                strokeDasharray={`${Math.max(arc.length - gap, 0)} ${circumference}`}
                strokeDashoffset={-arc.start}
                opacity={dimmed ? 0.35 : 1}
                className="transition-all duration-300"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-8 text-center">
          <span className="truncate text-xs font-semibold text-text-muted">{active ? active.name : "Total gasto"}</span>
          <Money
            value={(active ? active.cents : toCents(data.total ?? 0)) / 100}
            className="font-display text-xl font-bold tracking-tight"
          />
          {active && (
            <span className="text-xs font-bold text-text-soft">{percentFormat.format(active.percentage)}%</span>
          )}
        </div>
      </div>

      <ul className="flex w-full flex-col gap-1">
        {slices.map((slice) => (
          <li key={slice.key}>
            <button
              type="button"
              aria-pressed={selected === slice.key}
              onClick={() => setSelected((current) => (current === slice.key ? null : slice.key))}
              className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-left transition hover:bg-ink-800 aria-pressed:bg-ink-800"
            >
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: slice.color }} />
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{slice.name}</span>
              <span className="shrink-0 text-sm font-semibold text-text-soft tabular-nums">
                {percentFormat.format(slice.percentage)}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}