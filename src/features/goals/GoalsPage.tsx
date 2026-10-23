import { useState } from "react";
import { useCreateGoal, useGoals, type Goal } from "./goalsApi";
import { GoalCard } from "./GoalCard";
import { GoalForm } from "./GoalForm";
import { PlusIcon } from "../../shared/ui/icons";

const ORDER = { OVERDUE: 0, IN_PROGRESS: 1, REACHED: 2 };

function byPriority(a: Goal, b: Goal): number {
  const byStatus = ORDER[a.status ?? "IN_PROGRESS"] - ORDER[b.status ?? "IN_PROGRESS"];
  return byStatus !== 0 ? byStatus : (a.deadline ?? "").localeCompare(b.deadline ?? "");
}

export function GoalsPage() {
  const goals = useGoals();
  const createGoal = useCreateGoal();
  const [creating, setCreating] = useState(false);

  const list = [...(goals.data ?? [])].sort(byPriority);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-semibold">Metas</h1>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex h-11 items-center gap-2 rounded-full bg-surface px-4 text-sm font-bold text-text transition active:scale-95"
          >
            <PlusIcon width={18} height={18} />
            Nova meta
          </button>
        )}
      </header>

      {creating && (
        <GoalForm
          submitLabel="Criar meta"
          pending={createGoal.isPending}
          error={createGoal.error}
          onSubmit={(body) => createGoal.mutate(body, { onSuccess: () => setCreating(false) })}
          onCancel={() => setCreating(false)}
        />
      )}

      {goals.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Carregando">
          <div className="h-40 animate-pulse rounded-card bg-surface" />
          <div className="h-40 animate-pulse rounded-card bg-surface" />
        </div>
      ) : list.length === 0 && !creating ? (
        <div className="flex flex-col items-start gap-3 rounded-card border border-dashed border-line p-5">
          <p className="text-sm leading-snug text-text-soft">
            Uma meta transforma um sonho num valor por mês. Diga quanto quer juntar e até quando, e o app calcula o resto.
          </p>
          <button type="button" onClick={() => setCreating(true)} className="text-sm font-bold text-signal">
            Criar minha primeira meta
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </div>
  );
}