import type { BudgetLine } from "./homeApi";
import { Money } from "../../shared/ui/Money";
import { EmptyCard, SectionHeader } from "./GoalsSection";

export function BudgetSummary({ lines, hasAnyBudget }: { lines: BudgetLine[]; hasAnyBudget: boolean }) {
  if (!hasAnyBudget) {
    return (
      <section className="flex flex-col gap-3">
        <SectionHeader title="Orçamento do mês" to="/budget" />
        <EmptyCard text="Você ainda não definiu quanto quer gastar por categoria." action="Definir orçamento" to="/budget" />
      </section>
    );
  }
  if (lines.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader title="Orçamento do mês" to="/budget" />
      <div className="flex flex-col gap-5 rounded-card bg-surface p-5">
        {lines.map((line) => (
          <div key={line.categoryId} className="flex flex-col gap-2">
            <div className="flex justify-between gap-3 text-sm">
              <span className="truncate font-bold">{line.categoryName}</span>
              <span className="shrink-0 text-text-soft">
                <Money value={line.spent ?? 0} /> de <Money value={line.effectiveLimit ?? 0} />
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-track">
              <div
                className={`h-full rounded-full transition-[width] duration-700 ease-out ${line.categoryType === "SAVING" ? "bg-saving" : "bg-income"}`}
                style={{ width: `${Math.min(line.usedPercentage ?? 0, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}