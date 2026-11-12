import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { calendarQuery, useCalendar, useReminders, type CalendarEvent, type CalendarScope } from "./calendarApi";
import { amountOf, linkOf, statusOf } from "./events";
import { holidaysByDate, holidaysQuery, useHolidays } from "../bills/holidaysApi";
import { useCompanies } from "../company/companyApi";
import { usePrefetchAdjacentMonths } from "../../shared/api/usePrefetchAdjacentMonths";
import { MonthSwipe } from "../../shared/gestures/MonthSwipe";
import { DUE_WORDS } from "../../shared/lib/monthCalendar";
import { currentMonth, formatDate, todayIso } from "../../shared/lib/dates";
import { Badge } from "../../shared/ui/Badge";
import { EmptyState } from "../../shared/ui/EmptyState";
import { MonthCalendar } from "../../shared/ui/MonthCalendar";
import { MonthSwitcher } from "../../shared/ui/MonthSwitcher";

const SCOPES: { value: CalendarScope; label: string }[] = [
  { value: "ALL", label: "Tudo" },
  { value: "PF", label: "Pessoal" },
  { value: "PJ", label: "Empresas" },
];

function EventItem({ event, showDate }: { event: CalendarEvent; showDate: boolean }) {
  const status = statusOf(event);
  const when = event.status === "OVERDUE" ? `Venceu em ${formatDate(event.dueDate)}` : `Vence em ${formatDate(event.dueDate)}`;
  return (
    <li className="border-b border-line last:border-b-0">
      <Link to={linkOf(event)} className={`flex min-h-14 items-center gap-3 py-2 ${event.nothingToPay ? "opacity-60" : ""}`}>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">
            {event.company && <span aria-hidden="true" className="mr-1">{event.company.emoji}</span>}
            {event.title}
          </span>
          <span className="truncate text-xs text-text-muted">
            {/* A data vem primeiro: numa linha cortada, é ela que não pode sumir. */}
            {[showDate ? when : null, event.company?.name, event.detail].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className="flex flex-col items-end gap-1">
          <span className={`font-semibold tabular-nums ${event.direction === "IN" ? "text-income-strong" : ""}`}>{amountOf(event)}</span>
          <Badge tone={status.tone}>{status.label}</Badge>
        </span>
      </Link>
    </li>
  );
}

function Attention({ scope, companyId }: { scope: CalendarScope; companyId?: number }) {
  const reminders = useReminders(scope, companyId);
  const data = reminders.data;
  if (!data || data.count === 0) return null;
  const events = [...data.overdue, ...data.nextDays];
  return (
    <section aria-label="Pede atenção" className="flex flex-col gap-1 rounded-card bg-surface p-4 shadow-card">
      <h2 className="font-display text-base font-semibold">Pede atenção ({data.count})</h2>
      <p className="text-xs text-text-muted">Atrasados e o que vence nos próximos 7 dias.</p>
      <ul className="flex flex-col">
        {events.map((event) => <EventItem key={event.id} event={event} showDate />)}
      </ul>
    </section>
  );
}

/**
 * O calendário fiscal unificado (decisão 32): contas pessoais, impostos e despesas fixas das empresas,
 * com o filtro na URL. Com {@code companyId}, é a aba de uma empresa: travado nela, sem filtro.
 */
export function FiscalCalendar({ companyId }: { companyId?: number }) {
  const [params, setParams] = useSearchParams();
  const companies = useCompanies().data ?? [];
  const locked = companyId !== undefined;
  const scope: CalendarScope = locked ? "PJ" : ((["PF", "PJ"] as const).find((s) => s === params.get("scope")) ?? "ALL");
  const chosen = locked ? companyId : Number(params.get("company")) || undefined;
  const filterCompany = scope === "PF" ? undefined : chosen;

  const [month, setMonth] = useState(currentMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const events = useCalendar(month, scope, filterCompany);
  usePrefetchAdjacentMonths(month, (neighbor) => calendarQuery(neighbor, scope, filterCompany));
  const holidaysOfYear = useHolidays(Number(month.slice(0, 4)));
  usePrefetchAdjacentMonths(month, (neighbor) => holidaysQuery(Number(neighbor.slice(0, 4))));
  const holidays = holidaysByDate(holidaysOfYear.data?.holidays ?? []);

  function changeMonth(next: string) {
    setMonth(next);
    setSelectedDay(null);
  }

  function changeFilter(nextScope: CalendarScope, nextCompany?: number) {
    const next = new URLSearchParams();
    if (nextScope !== "ALL") next.set("scope", nextScope);
    if (nextCompany && nextScope !== "PF") next.set("company", String(nextCompany));
    setParams(next, { replace: true });
    setSelectedDay(null);
  }

  const all = events.data ?? [];
  const visible = selectedDay ? all.filter((event) => event.dueDate === selectedDay) : all;

  return (
    <div className="flex flex-col gap-5">
      {!locked && (
        <div className="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="Mostrar" className="flex gap-1 rounded-full bg-sunken p-1">
            {SCOPES.map(({ value, label }) => (
              <button key={value} type="button" aria-pressed={scope === value} onClick={() => changeFilter(value, chosen)}
                className={`flex h-11 items-center rounded-full px-4 text-sm font-bold transition ${
                  scope === value ? "bg-surface text-text shadow-clay-sm" : "text-text-muted"
                }`}>
                {label}
              </button>
            ))}
          </div>
          {scope !== "PF" && companies.length > 1 && (
            <label className="flex items-center gap-2 text-sm font-semibold text-text-muted">
              <span className="sr-only">Empresa</span>
              <select value={chosen ?? ""} onChange={(e) => changeFilter(scope === "ALL" ? "PJ" : scope, Number(e.target.value) || undefined)}
                className="h-11 rounded-full bg-surface px-4 text-base font-bold text-text shadow-clay-sm">
                <option value="">Todas as empresas</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.emoji} {company.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      <Attention scope={scope} companyId={filterCompany} />

      <MonthSwitcher month={month} onChange={changeMonth} />
      <MonthSwipe month={month} onChange={changeMonth}>
        <div className="flex flex-col gap-5">
          {events.isPending ? (
            <div className="h-80 motion-safe:animate-pulse rounded-card bg-sunken" aria-label="Carregando o calendário" />
          ) : events.isError ? (
            <div role="alert" className="flex flex-col items-start gap-3 rounded-card bg-surface p-5">
              <p className="text-sm text-text-soft">{events.error.message}</p>
              <button type="button" onClick={() => events.refetch()} className="min-h-11 text-sm font-bold text-link">
                Tentar de novo
              </button>
            </div>
          ) : (
            <>
              <MonthCalendar month={month} occurrences={all} holidays={holidays} today={todayIso()}
                selectedDay={selectedDay} onSelectDay={setSelectedDay} words={DUE_WORDS} />
              <p className="-mt-3 px-1 text-xs leading-snug text-text-muted">
                Só feriados nacionais, segundo a BrasilAPI. Feriados estaduais e municipais não aparecem nem mudam o prazo.
              </p>
              <section className="flex flex-col gap-2 rounded-card bg-surface p-4 shadow-card">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-base font-semibold">
                    {selectedDay ? `Vence em ${formatDate(selectedDay)}` : "Vencimentos do mês"}
                  </h2>
                  {selectedDay && (
                    <button type="button" onClick={() => setSelectedDay(null)} className="min-h-11 text-sm font-bold text-link">
                      Ver o mês todo
                    </button>
                  )}
                </div>
                {visible.length === 0 ? (
                  <EmptyState>{selectedDay ? "Nada vence neste dia." : "Nada vence neste mês."}</EmptyState>
                ) : (
                  <ul aria-label="Vencimentos" className="flex flex-col">
                    {visible.map((event) => <EventItem key={event.id} event={event} showDate={!selectedDay} />)}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </MonthSwipe>
    </div>
  );
}
