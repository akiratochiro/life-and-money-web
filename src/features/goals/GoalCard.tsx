import { useState } from "react";
import { Link } from "react-router";
import { useDeleteGoal, useUpdateGoal, type Goal } from "./goalsApi";
import { GoalForm } from "./GoalForm";
import { Ring } from "../../shared/ui/Ring";
import { Badge, type BadgeTone } from "../../shared/ui/Badge";
import { Money } from "../../shared/ui/Money";
import { formatDate } from "../../shared/lib/dates";
import { toCents } from "../../shared/lib/money";

type GoalStatus = NonNullable<Goal["status"]>;

const STATUS: Record<GoalStatus, { label: string; tone: BadgeTone; ring: string }> = {
  IN_PROGRESS: { label: "Em dia", tone: "saving", ring: "var(--color-saving)" },
  OVERDUE: { label: "Atrasada", tone: "danger", ring: "var(--color-danger)" },
  REACHED: { label: "Concluída", tone: "income", ring: "var(--color-income)" },
};

function monthsLeftText(monthsLeft: number): string {
  if (monthsLeft <= 0) return "último mês";
  if (monthsLeft === 1) return "falta 1 mês";
  return `faltam ${monthsLeft} meses`;
}

export function GoalCard({ goal }: { goal: Goal }) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const id = goal.id!;
  const status = goal.status ?? "IN_PROGRESS";
  const style = STATUS[status];
  const target = goal.targetAmount ?? 0;
  const saved = goal.saved ?? 0;
  const progress = target > 0 ? (saved / target) * 100 : 0;

  if (mode === "edit") {
    return (
      <GoalForm
        initial={{ name: goal.name ?? "", cents: toCents(target), deadline: goal.deadline ?? "" }}
        submitLabel="Salvar alterações"
        pending={updateGoal.isPending}
        error={updateGoal.error}
        onSubmit={(body) => updateGoal.mutate({ id, body }, { onSuccess: () => setMode("view") })}
        onCancel={() => setMode("view")}
      />
    );
  }

  return (
    <article className="flex flex-col gap-4 rounded-card bg-surface p-5 shadow-card">
      <div className="flex items-center gap-4">
        <Ring percent={progress} color={style.ring} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-bold">{goal.name}</h3>
            <Badge tone={style.tone}>{style.label}</Badge>
          </div>
          <p className="text-sm text-text-soft">
            <Money value={saved} /> de <Money value={target} />
          </p>
          {goal.deadline && (
            <p className="text-xs font-semibold text-text-muted">
              até {formatDate(goal.deadline)}
              {status === "IN_PROGRESS" && ` · ${monthsLeftText(goal.monthsLeft ?? 0)}`}
            </p>
          )}
        </div>
      </div>

      {status === "IN_PROGRESS" && (
        <div className="flex items-center justify-between rounded-2xl bg-ink-800 px-4 py-3">
          <span className="text-sm text-text-soft">Guarde por mês</span>
          <Money value={goal.monthlyNeeded ?? 0} className="font-extrabold text-signal" />
        </div>
      )}
      {status === "OVERDUE" && (
        <div className="flex items-center justify-between rounded-2xl bg-ink-800 px-4 py-3">
          <span className="text-sm text-text-soft">O prazo passou. Faltam</span>
          <Money value={goal.remaining ?? 0} className="font-extrabold text-danger" />
        </div>
      )}

      {mode === "delete" ? (
        <div className="flex flex-col gap-3 rounded-2xl bg-ink-800 p-4">
          <p className="text-sm leading-snug text-text-soft">
            Apagar a meta <strong className="text-text">{goal.name}</strong>?{" "}
            {saved > 0 ? (
              <>
                Os <Money value={saved} /> guardados nela continuam registrados como poupança.
              </>
            ) : (
              "Nenhum aporte foi feito nela ainda."
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={deleteGoal.isPending}
              onClick={() => deleteGoal.mutate(id)}
              className="h-11 flex-1 rounded-full bg-danger font-bold text-[#1a0710] transition active:scale-95 disabled:opacity-60"
            >
              {deleteGoal.isPending ? "Apagando..." : "Apagar meta"}
            </button>
            <button
              type="button"
              onClick={() => setMode("view")}
              className="h-11 flex-1 rounded-full bg-surface font-bold text-text transition active:scale-95"
            >
              Voltar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1">
          {status !== "REACHED" && (
            <Link
              to={`/transactions/new?type=SAVING&goalId=${id}&returnTo=/goals`}
              className="flex h-11 items-center rounded-full bg-signal px-5 text-sm font-bold text-ink-900 transition active:scale-95"
            >
              Guardar
            </Link>
          )}
          <button type="button" onClick={() => setMode("edit")} className="h-11 px-3 text-sm font-bold text-text-muted hover:text-text">
            Editar
          </button>
          <button type="button" onClick={() => setMode("delete")} className="h-11 px-3 text-sm font-bold text-text-muted hover:text-danger">
            Apagar
          </button>
        </div>
      )}
    </article>
  );
}