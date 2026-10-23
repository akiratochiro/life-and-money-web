import { useState } from "react";
import { useRemoveBudget, type BudgetLine, type BudgetStatus } from "./budgetApi";
import { BudgetEditor } from "./BudgetEditor";
import { Badge, type BadgeTone } from "../../shared/ui/Badge";
import { Money } from "../../shared/ui/Money";

const STATUS: Record<BudgetStatus, { label: string; tone: BadgeTone; bar: string }> = {
  OK: { label: "Em dia", tone: "income", bar: "bg-income" },
  WARNING: { label: "Atenção", tone: "warning", bar: "bg-warning" },
  EXCEEDED: { label: "Estourou", tone: "danger", bar: "bg-danger" },
  IN_PROGRESS: { label: "Guardando", tone: "saving", bar: "bg-saving" },
  REACHED: { label: "Meta batida", tone: "income", bar: "bg-saving" },
};

const percent = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

type Props = { line: BudgetLine; editable: boolean };

export function BudgetLineCard({ line, editable }: Props) {
  const [mode, setMode] = useState<"view" | "edit" | "remove">("view");
  const removeBudget = useRemoveBudget();
  const status = STATUS[line.status ?? "OK"];
  const categoryId = line.categoryId!;
  const isSaving = line.categoryType === "SAVING";

  return (
    <article className="flex flex-col gap-3 rounded-card bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate font-bold">{line.categoryName}</h3>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      <div className="h-2.5 rounded-full bg-track" aria-hidden="true">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${status.bar}`}
          style={{ width: `${Math.min(line.usedPercentage ?? (line.status === "EXCEEDED" ? 100 : 0), 100)}%` }}
        />
      </div>

      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-text-soft">
          <Money value={line.spent ?? 0} /> {isSaving ? "guardados" : "gastos"} de <Money value={line.effectiveLimit ?? 0} />
        </span>
        <span className="shrink-0 text-xs font-semibold text-text-muted">
          {line.mode === "PERCENTAGE" ? `${percent.format(line.limitValue ?? 0)}% da receita` : "Valor fixo"}
        </span>
      </div>

      {editable && mode === "view" && (
        <div className="flex gap-1">
          <button type="button" onClick={() => setMode("edit")} className="h-11 px-3 text-sm font-bold text-signal">
            Editar
          </button>
          <button type="button" onClick={() => setMode("remove")} className="h-11 px-3 text-sm font-bold text-text-muted hover:text-text">
            Remover
          </button>
        </div>
      )}

      {mode === "edit" && (
        <BudgetEditor
          categoryId={categoryId}
          initialMode={line.mode}
          initialLimit={line.limitValue}
          onDone={() => setMode("view")}
        />
      )}

      {mode === "remove" && (
        <div className="flex flex-col gap-3 rounded-2xl bg-ink-800 p-4">
          <p className="text-sm leading-snug text-text-soft">
            A partir deste mês, <strong className="text-text">{line.categoryName}</strong> sai do orçamento. Os meses
            anteriores continuam como estavam.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={removeBudget.isPending}
              onClick={() => removeBudget.mutate(categoryId, { onSuccess: () => setMode("view") })}
              className="h-11 flex-1 rounded-full bg-warning font-bold text-[#1f1400] transition active:scale-95 disabled:opacity-60"
            >
              {removeBudget.isPending ? "Removendo..." : "Remover"}
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
      )}
    </article>
  );
}