import type { BudgetLine } from "../budget/budgetApi";
import type { Goal } from "../goals/goalsApi";
import { Card } from "../../shared/ui/Card";
import { Ring } from "../../shared/ui/Ring";
import { Badge } from "../../shared/ui/Badge";
import { Money } from "../../shared/ui/Money";
import { lastDayOfMonth } from "../../shared/lib/dates";
import { bySeverity, isAlert } from "./budgetAlerts";

type Props = { lines: BudgetLine[]; overdueGoals: Goal[] };

export function AttentionSection({ lines, overdueGoals }: Props) {
  const alerts = lines.filter(isAlert).sort(bySeverity);
  const total = alerts.length + overdueGoals.length;

  if (total === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">Precisa da sua atenção</h2>
        <span className="rounded-full bg-signal px-2.5 py-1 text-xs font-extrabold text-ink-900">{total}</span>
      </div>
      {alerts.map((line) => (
        <BudgetAlertCard key={line.categoryId} line={line} />
      ))}
      {overdueGoals.map((goal) => (
        <OverdueGoalCard key={goal.id} goal={goal} />
      ))}
    </section>
  );
}

function BudgetAlertCard({ line }: { line: BudgetLine }) {
  const exceeded = line.status === "EXCEEDED";
  const used = line.usedPercentage;

  return (
    <Card className="flex items-center gap-4 bg-surface-raised">
      <Ring
        percent={used ?? 100}
        color={exceeded ? "var(--color-danger)" : "var(--color-warning)"}
        label={used != null ? `${Math.round(used)}%` : "—"}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-bold">{line.categoryName}</span>
          <Badge tone={exceeded ? "danger" : "warning"}>{exceeded ? "Estourou" : "Atenção"}</Badge>
        </div>
        <p className="text-sm leading-snug text-text-soft">
          {exceeded ? (
            <>Você passou <Money value={Math.abs(line.remaining)} /> do planejado.</>
          ) : (
            <>Restam <Money value={line.remaining} /> até {lastDayOfMonth()}.</>
          )}
        </p>
      </div>
    </Card>
  );
}

function OverdueGoalCard({ goal }: { goal: Goal }) {
  const target = goal.targetAmount;
  const progress = target > 0 ? (goal.saved / target) * 100 : 0;

  return (
    <Card className="flex items-center gap-4 bg-surface-raised">
      <Ring percent={progress} color="var(--color-danger)" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-bold">{goal.name}</span>
          <Badge tone="danger">Atrasada</Badge>
        </div>
        <p className="text-sm leading-snug text-text-soft">
          O prazo passou. Faltam <Money value={goal.remaining} /> para a meta.
        </p>
      </div>
    </Card>
  );
}