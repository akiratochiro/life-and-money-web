import type { ExpenseCategory } from "./companyExpensesApi";
import { CategoryTile } from "../categories/CategoryGlyph";

type Props = { categories: ExpenseCategory[]; value: number | null; onChange: (id: number) => void; error?: string };

/** As categorias que dá para escolher numa despesa: ativas e que não são do sistema (Impostos). */
export function CategoryChips({ categories, value, onChange, error }: Props) {
  const selectable = categories.filter((category) => !category.system && !category.archived);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-semibold text-text-muted">Categoria</legend>
      <div className="flex flex-wrap gap-2">
        {selectable.map((category) => (
          <button
            key={category.id}
            type="button"
            aria-pressed={value === category.id}
            onClick={() => onChange(category.id)}
            className={`flex min-h-11 items-center gap-2 rounded-full py-1 pl-1 pr-4 text-sm font-bold transition active:scale-95 ${
              value === category.id ? "bg-surface text-text shadow-clay-sm" : "text-text-muted"
            }`}
          >
            <CategoryTile color={category.color} icon={category.icon} size="sm" />
            {category.name}
          </button>
        ))}
      </div>
      {error && <span className="text-sm font-semibold text-danger-strong">{error}</span>}
    </fieldset>
  );
}
