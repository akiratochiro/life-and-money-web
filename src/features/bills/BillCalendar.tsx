import type { BillOccurrence, BillStatus } from "./billsApi";
import { byDueDate, dayLabel, monthGrid, summarize } from "./calendar";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEKDAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

type Props = {
  month: string;
  occurrences: BillOccurrence[];
  /** Nome do feriado por data "AAAA-MM-DD". */
  holidays?: Map<string, string>;
  today: string;
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
};

/**
 * Calendário do mês em CSS grid, sem biblioteca: sete colunas, e o dia 1 começa na coluna do dia
 * da semana dele (`grid-column-start`), então não há casas vazias no HTML.
 */
export function BillCalendar({ month, occurrences, holidays = new Map(), today, selectedDay, onSelectDay }: Props) {
  const grid = monthGrid(month);
  const days = byDueDate(occurrences);

  return (
    <div className="rounded-card bg-surface p-3 shadow-card">
      <div className="grid grid-cols-7 gap-1 pb-1" aria-hidden="true">
        {WEEKDAYS.map((weekday, index) => (
          <span key={index} className="text-center text-[11px] font-bold text-text-muted">
            {weekday}
          </span>
        ))}
      </div>
      <div role="group" aria-label="Dias do mês" className="grid grid-cols-7 gap-1">
        {grid.days.map((day, index) => {
          const summary = summarize(days.get(day) ?? []);
          const selected = day === selectedDay;
          const isToday = day === today;
          const holiday = holidays.get(day);
          return (
            <button
              key={day}
              type="button"
              aria-label={dayLabel(day, summary, holiday)}
              data-holiday={holiday ? "true" : undefined}
              aria-pressed={selected}
              aria-current={isToday ? "date" : undefined}
              title={holiday ?? WEEKDAY_NAMES[(grid.leadingBlanks + index) % 7]}
              onClick={() => onSelectDay(selected ? null : day)}
              style={index === 0 ? { gridColumnStart: grid.leadingBlanks + 1 } : undefined}
              className={`relative flex aspect-square min-h-11 flex-col items-center justify-center gap-1 rounded-2xl text-sm font-bold tabular-nums transition active:scale-95 ${
                selected
                  ? "bg-text text-on-accent"
                  : isToday
                    ? "bg-accent-soft text-accent ring-1 ring-accent"
                    : holiday
                      ? "bg-saving-soft text-saving-strong hover:bg-saving/30"
                      : "text-text-soft hover:bg-sunken"
              }`}
            >
              {holiday && <HolidayStar className="absolute right-1 top-1" />}
              {Number(day.slice(8))}
              <Markers summary={summary} />
            </button>
          );
        })}
      </div>
      <Legend />
    </div>
  );
}

function Markers({ summary }: { summary: ReturnType<typeof summarize> }) {
  const statuses = (["OVERDUE", "PENDING", "PAID"] as const).filter((status) => summary[status] > 0);
  return (
    <span className="flex h-2 items-center gap-0.5" aria-hidden="true">
      {statuses.map((status) => (
        <Marker key={status} status={status} />
      ))}
    </span>
  );
}

/**
 * Cada status tem forma própria, além da cor: ponto cheio (atrasada), anel (pendente) e traço
 * de visto (paga). Quem não distingue vermelho de verde ainda lê o calendário.
 */
export function Marker({ status }: { status: BillStatus }) {
  if (status === "OVERDUE") {
    return <span data-status="OVERDUE" className="h-2 w-2 rounded-full bg-danger" />;
  }
  if (status === "PENDING") {
    return <span data-status="PENDING" className="h-2 w-2 rounded-full border-[1.5px] border-warning" />;
  }
  return (
    <svg data-status="PAID" width="9" height="9" viewBox="0 0 10 10" className="text-income-strong">
      <path d="M1.5 5.2l2.3 2.3L8.5 2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs font-semibold text-text-muted">
      <span className="flex items-center gap-1.5"><Marker status="OVERDUE" /> Atrasada</span>
      <span className="flex items-center gap-1.5"><Marker status="PENDING" /> Pendente</span>
      <span className="flex items-center gap-1.5"><Marker status="PAID" /> Paga</span>
      <span className="flex items-center gap-1.5">
        <span className="flex h-4 w-4 items-center justify-center rounded-md bg-saving-soft">
          <HolidayStar />
        </span>
        Feriado nacional
      </span>
    </div>
  );
}

/**
 * O feriado não é um marcador de conta: ele pinta o dia inteiro e ganha uma estrela no canto,
 * para não ser confundido com um vencimento.
 */
function HolidayStar({ className = "" }: { className?: string }) {
  return (
    <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true" className={`text-saving-strong ${className}`}>
      <path d="M5 0.6l1.3 2.9 3.1.3-2.4 2.1.7 3.1L5 7.4 2.3 9l.7-3.1L.6 3.8l3.1-.3z" fill="currentColor" />
    </svg>
  );
}
