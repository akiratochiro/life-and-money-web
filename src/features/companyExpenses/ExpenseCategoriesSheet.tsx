import { useState, type FormEvent } from "react";
import {
  useArchiveExpenseCategory,
  useCreateExpenseCategory,
  useExpenseCategories,
  useUpdateExpenseCategory,
  type ExpenseCategory,
} from "./companyExpensesApi";
import { CategoryTile } from "../categories/CategoryGlyph";
import { CategoryLookPicker } from "../categories/CategoryLookPicker";
import type { CategoryColor, CategoryIcon } from "../categories/categoryLook";
import { ApiError } from "../../shared/api/problem";
import { BottomSheet } from "../../shared/ui/BottomSheet";
import { TextField } from "../../shared/ui/TextField";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { LockIcon } from "../../shared/ui/icons";

export const PAYROLL_HELP =
  "Despesas nesta categoria entram na folha de salários do Fator R: salários, encargos e FGTS de funcionários. " +
  "O pró-labore dos sócios entra sozinho, pelas retiradas.";

/**
 * As categorias de despesa da empresa: criar, editar nome, cor e ícone, marcar se contam como folha
 * do Fator R, e arquivar. Impostos aparece com cadeado: é do sistema e recebe os impostos pagos.
 */
export function ExpenseCategoriesSheet({ companyId, onClose }: { companyId: number; onClose: () => void }) {
  const categories = useExpenseCategories(companyId);
  const [editing, setEditing] = useState<number | "new" | null>(null);

  return (
    <BottomSheet title="Categorias da empresa" open onClose={onClose}>
      <div className="flex flex-col gap-2 pt-2">
        {(categories.data ?? []).map((category) =>
          editing === category.id ? (
            <CategoryForm key={category.id} companyId={companyId} category={category} onDone={() => setEditing(null)} />
          ) : (
            <div key={category.id} className="flex min-h-13 items-center gap-3">
              <CategoryTile color={category.color} icon={category.icon} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{category.name}</span>
                {category.countsAsPayroll && <span className="text-xs text-text-muted">Conta como folha (Fator R)</span>}
                {category.system && <span className="text-xs text-text-muted">Do sistema: recebe os impostos pagos</span>}
              </span>
              {category.system ? (
                <LockIcon aria-label="Categoria do sistema" className="text-text-muted" />
              ) : (
                <button type="button" onClick={() => setEditing(category.id)}
                  aria-label={`Editar ${category.name}`}
                  className="flex min-h-11 items-center px-2 text-sm font-bold text-link">
                  Editar
                </button>
              )}
            </div>
          ),
        )}
        {editing === "new" ? (
          <CategoryForm companyId={companyId} onDone={() => setEditing(null)} />
        ) : (
          <button type="button" onClick={() => setEditing("new")} className="flex min-h-11 items-center self-start text-sm font-bold text-link">
            Nova categoria
          </button>
        )}
      </div>
    </BottomSheet>
  );
}

function CategoryForm({ companyId, category, onDone }: { companyId: number; category?: ExpenseCategory; onDone: () => void }) {
  const create = useCreateExpenseCategory(companyId);
  const update = useUpdateExpenseCategory(companyId);
  const archive = useArchiveExpenseCategory(companyId);
  const [name, setName] = useState(category?.name ?? "");
  const [look, setLook] = useState<{ color: CategoryColor; icon: CategoryIcon }>({
    color: category?.color ?? "CORAL",
    icon: category?.icon ?? "OTHER",
  });
  const [payroll, setPayroll] = useState(category?.countsAsPayroll ?? false);
  const mutation = category ? update : create;
  const fieldErrors = mutation.error instanceof ApiError ? mutation.error.fieldErrors : {};

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const body = { name: name.trim(), ...look, countsAsPayroll: payroll };
    if (category) update.mutate({ categoryId: category.id, body }, { onSuccess: onDone });
    else create.mutate(body, { onSuccess: onDone });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl bg-sunken p-4">
      <TextField label="Nome da categoria" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)}
        error={fieldErrors.name} />
      <CategoryLookPicker color={look.color} icon={look.icon} onChange={setLook} />
      <label className="flex min-h-11 items-start gap-3 text-sm text-text-soft">
        <input type="checkbox" checked={payroll} onChange={(e) => setPayroll(e.target.checked)} className="mt-0.5 h-5 w-5 accent-accent" />
        <span>
          <span className="font-semibold">Conta como folha (Fator R)</span>
          <span className="block text-xs text-text-muted">{PAYROLL_HELP}</span>
        </span>
      </label>
      {(mutation.error ?? archive.error) && Object.keys(fieldErrors).length === 0 && (
        <p role="alert" className="text-sm font-semibold text-danger-strong">{(mutation.error ?? archive.error)!.message}</p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={!name.trim() || mutation.isPending}
          className="h-12 flex-1 rounded-full bg-accent font-bold text-on-accent shadow-clay-accent disabled:opacity-60">
          <PendingLabel pending={mutation.isPending} pendingText="Salvando…">{category ? "Salvar" : "Criar categoria"}</PendingLabel>
        </button>
        <button type="button" onClick={onDone} className="h-12 flex-1 rounded-full bg-surface font-bold">Cancelar</button>
      </div>
      {category && (
        <button type="button" disabled={archive.isPending} onClick={() => archive.mutate(category.id, { onSuccess: onDone })}
          className="flex min-h-11 items-center self-start text-sm font-bold text-danger-strong disabled:opacity-60">
          <PendingLabel pending={archive.isPending} pendingText="Arquivando…">Arquivar categoria (encerra as despesas fixas dela)</PendingLabel>
        </button>
      )}
    </form>
  );
}
