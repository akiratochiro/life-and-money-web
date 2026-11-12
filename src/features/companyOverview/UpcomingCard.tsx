import { Link } from "react-router";
import { useUpcoming, type UpcomingItem } from "./companyOverviewApi";
import { Badge } from "../../shared/ui/Badge";
import { Card } from "../../shared/ui/Card";
import { formatDate } from "../../shared/lib/dates";
import { formatCents, toCents } from "../../shared/lib/money";

const SHOWN = 5;

function tabOf(item: UpcomingItem) {
  return item.source === "TAX" ? "taxes" : "expenses";
}

/** Os próximos vencimentos (decisão 28): os atrasados primeiro, até 5, e o link para o resto. */
export function UpcomingCard({ companyId }: { companyId: number }) {
  const upcoming = useUpcoming(companyId);
  const items = upcoming.data ?? [];
  const rest = items.slice(SHOWN);

  return (
    <Card className="flex flex-col gap-3">
      <h2 className="font-display text-base font-semibold">Próximos vencimentos</h2>
      {upcoming.isPending ? (
        <div className="h-24 motion-safe:animate-pulse rounded-2xl bg-sunken" />
      ) : upcoming.isError ? (
        <p role="alert" className="text-sm font-semibold text-danger-strong">{upcoming.error.message}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-text-muted">Nada atrasado nem vencendo nos próximos 30 dias.</p>
      ) : (
        <ul aria-label="Próximos vencimentos" className="flex flex-col">
          {items.slice(0, SHOWN).map((item) => (
            <li key={`${item.source}-${item.name}-${item.dueDate}`} className="border-b border-line last:border-b-0">
              <Link to={tabOf(item)} className="flex min-h-14 items-center gap-3 py-2">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold">{item.name}</span>
                  <span className="text-xs text-text-muted">
                    {item.status === "OVERDUE" ? "Venceu" : "Vence"} em {formatDate(item.dueDate)}
                    {item.source === "TAX" ? " · imposto" : " · despesa fixa"}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className="font-semibold tabular-nums">
                    {item.amount != null ? formatCents(toCents(item.amount)) : "Sem valor"}
                  </span>
                  <Badge tone={item.status === "OVERDUE" ? "danger" : "warning"}>
                    {item.status === "OVERDUE" ? "Atrasado" : "Pendente"}
                  </Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {rest.length > 0 && (
        <p className="flex flex-wrap items-center gap-x-3 text-sm text-text-muted">
          E mais {rest.length}:
          <Link to="taxes" className="flex min-h-11 items-center font-bold text-link">ver impostos</Link>
          <Link to="expenses" className="flex min-h-11 items-center font-bold text-link">ver despesas</Link>
        </p>
      )}
    </Card>
  );
}
