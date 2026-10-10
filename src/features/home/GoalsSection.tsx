import { Link } from "react-router";
import type { Goal } from "./homeApi";
import { Card } from "../../shared/ui/Card";
import { Ring } from "../../shared/ui/Ring";
import { Badge } from "../../shared/ui/Badge";
import { Money } from "../../shared/ui/Money";

function byPriority(a: Goal, b: Goal): number {
  if (a.status !== b.status) {
    return a.status === "IN_PROGRESS" ? -1 : 1;
  }
  return (a.deadline ?? "").localeCompare(b.deadline ?? "");
}

export function GoalsSection({ goals }: { goals: Goal[] }) {
  const visible = [...goals].sort(byPriority).slice(0, 2);

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="Metas" to="/goals" />
      {visible.length === 0 ? (
        <EmptyCard text="Você ainda não tem metas de poupança." action="Criar uma meta" to="/goals" />
      ) : (
        visible.map((goal) => <GoalCard key={goal.id} goal={goal} />)
      )}
    </section>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const target = goal.targetAmount ?? 0;
  const progress = target > 0 ? ((goal.saved ?? 0) / target) * 100 : 0;
  const reached = goal.status === "REACHED";

  return (
    <Card className="flex flex-col gap-3.5">
      <div className="flex items-center gap-4">
        <Ring percent={progress} color="var(--color-saving)" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-bold">{goal.name}</span>
            <Badge tone={reached ? "income" : "saving"}>{reached ? "Concluída" : "Em dia"}</Badge>
          </div>
          <p className="text-sm text-text-soft">
            <Money value={goal.saved ?? 0} /> de <Money value={target} />
          </p>
        </div>
      </div>
      {!reached && (
        <div className="flex items-center justify-between rounded-2xl bg-ink-800 px-4 py-3">
          <span className="text-sm text-text-soft">Guarde por mês</span>
          <Money value={goal.monthlyNeeded ?? 0} className="font-extrabold text-signal" />
        </div>
      )}
    </Card>
  );
}

export function SectionHeader({ title, to }: { title: string; to: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-display text-base font-semibold">{title}</h2>
      <Link to={to} className="py-3 text-sm font-bold text-signal">
        Ver tudo
      </Link>
    </div>
  );
}

export function EmptyCard({ text, action, to }: { text: string; action: string; to: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-line p-5">
      <p className="text-sm text-text-soft">{text}</p>
      <Link to={to} className="text-sm font-bold text-signal">
        {action}
      </Link>
    </div>
  );
}