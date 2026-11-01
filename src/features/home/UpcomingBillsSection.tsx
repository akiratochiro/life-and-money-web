import { Link } from "react-router";
import { useUpcomingBills, type BillOccurrence } from "../bills/billsApi";
import { byUrgency } from "../bills/calendar";
import { Marker } from "../bills/BillCalendar";
import { Badge } from "../../shared/ui/Badge";
import { Money } from "../../shared/ui/Money";
import { dayLabel } from "../../shared/lib/dates";
import { SectionHeader } from "./GoalsSection";

const VISIBLE = 4;

/**
 * Atrasadas e o que vence nos próximos 7 dias. Busca os próprios dados, em vez de entrar no
 * carregamento da Início: se as contas falharem, o resto da tela continua de pé.
 */
export function UpcomingBillsSection() {
  const upcoming = useUpcomingBills();

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="Vence nos próximos 7 dias" to="/bills" />
      {upcoming.isPending ? (
        <div className="h-24 animate-pulse rounded-card bg-surface" aria-busy="true" aria-label="Carregando contas" />
      ) : upcoming.isError ? (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-card bg-surface p-5">
          <p className="text-sm text-text-soft">Não foi possível carregar as contas.</p>
          <button type="button" onClick={() => upcoming.refetch()} className="text-sm font-bold text-signal">
            Tentar de novo
          </button>
        </div>
      ) : upcoming.data.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-line p-5">
          <p className="text-sm text-text-soft">Nada vence nos próximos 7 dias.</p>
          <Link to="/bills" className="text-sm font-bold text-signal">
            Ver o calendário de contas
          </Link>
        </div>
      ) : (
        <UpcomingList occurrences={upcoming.data} />
      )}
    </section>
  );
}

function UpcomingList({ occurrences }: { occurrences: BillOccurrence[] }) {
  const sorted = [...occurrences].sort(byUrgency);
  const visible = sorted.slice(0, VISIBLE);
  const hidden = sorted.length - visible.length;

  return (
    <div className="flex flex-col rounded-card bg-surface p-2 shadow-card">
      <ul className="flex flex-col">
        {visible.map((occurrence) => (
          <li
            key={`${occurrence.billId}@${occurrence.month}`}
            className="flex items-center gap-3 rounded-2xl px-3 py-3"
          >
            <span className="flex h-3 w-3 items-center justify-center" aria-hidden="true">
              <Marker status={occurrence.status} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-bold">{occurrence.name}</span>
              <span className="text-xs text-text-muted">
                {occurrence.type === "INCOME" ? "A receber" : "A pagar"} · {dayLabel(occurrence.dueDate)}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Money value={occurrence.expectedAmount} className="text-sm font-bold" />
              {occurrence.status === "OVERDUE" && <Badge tone="danger">Atrasada</Badge>}
            </div>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <Link to="/bills" className="flex h-11 items-center justify-center text-sm font-bold text-signal">
          Mais {hidden} {hidden === 1 ? "conta" : "contas"}
        </Link>
      )}
    </div>
  );
}
