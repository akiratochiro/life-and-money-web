import { useState, type FormEvent } from "react";
import {
  useArchiveCategory,
  useCategories,
  useCreateCategory,
  useRenameCategory,
  type Category,
  type CategoryType,
} from "./categoriesApi";
import { ApiError } from "../../shared/api/problem";
import { TextField } from "../../shared/ui/TextField";
import { Button } from "../../shared/ui/Button";

const SECTIONS: { type: CategoryType; title: string; dot: string }[] = [
  { type: "EXPENSE", title: "Despesas", dot: "bg-expense" },
  { type: "INCOME", title: "Receitas", dot: "bg-income" },
  { type: "SAVING", title: "Poupança", dot: "bg-saving" },
];

const TYPE_LABEL: Record<CategoryType, string> = {
  EXPENSE: "Despesa",
  INCOME: "Receita",
  SAVING: "Poupança",
};

function conflictMessage(error: Error | null): string | undefined {
  if (error instanceof ApiError && error.status === 409) {
    return "Já existe uma categoria ativa com esse nome e esse tipo.";
  }
  return error?.message;
}

export function CategoriesPage() {
  const categories = useCategories(true);
  const [showArchived, setShowArchived] = useState(false);

  const all = categories.data ?? [];
  const active = all.filter((category) => !category.archived);
  const archived = all.filter((category) => category.archived);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Categorias</h1>

      <NewCategoryForm />

      {categories.isPending ? (
        <div className="h-40 animate-pulse rounded-card bg-surface" aria-busy="true" aria-label="Carregando" />
      ) : (
        SECTIONS.map((section) => {
          const items = active.filter((category) => category.type === section.type);
          return (
            <section key={section.type} className="flex flex-col gap-2">
              <h2 className="flex items-center gap-2 px-1 font-display text-base font-semibold">
                <span className={`h-2 w-2 rounded-full ${section.dot}`} />
                {section.title}
              </h2>
              {items.length === 0 ? (
                <p className="px-1 text-sm text-text-muted">Nenhuma categoria ativa.</p>
              ) : (
                <ul className="flex flex-col rounded-card bg-surface p-2">
                  {items.map((category) => (
                    <CategoryRow key={category.id} category={category} />
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}

      {archived.length > 0 && (
        <section className="flex flex-col gap-2">
          <button
            type="button"
            aria-expanded={showArchived}
            onClick={() => setShowArchived((current) => !current)}
            className="h-11 self-start px-1 text-sm font-bold text-text-muted hover:text-text"
          >
            {showArchived ? "Esconder" : "Mostrar"} arquivadas ({archived.length})
          </button>
          {showArchived && (
            <ul className="flex flex-col rounded-card border border-dashed border-line p-2">
              {archived.map((category) => (
                <li key={category.id} className="flex items-center justify-between gap-3 px-3 py-3 text-text-muted">
                  <span className="truncate">{category.name}</span>
                  <span className="shrink-0 text-xs font-semibold">{TYPE_LABEL[category.type]}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function NewCategoryForm() {
  const createCategory = useCreateCategory();
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("EXPENSE");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createCategory.mutate({ name: name.trim(), type }, { onSuccess: () => setName("") });
  }

  const errorMessage = conflictMessage(createCategory.error);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-hero bg-surface p-5 shadow-card">
      <TextField
        label="Nova categoria"
        required
        maxLength={100}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ex.: Academia"
      />
      <div role="group" aria-label="Tipo da categoria" className="grid grid-cols-3 gap-1 rounded-full bg-ink-800 p-1">
        {SECTIONS.map((section) => (
          <button
            key={section.type}
            type="button"
            aria-pressed={type === section.type}
            onClick={() => setType(section.type)}
            className={`flex h-11 items-center justify-center gap-2 rounded-full text-sm font-bold transition active:scale-95 ${
              type === section.type ? "bg-signal text-ink-900" : "text-text-muted"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${section.dot}`} />
            {TYPE_LABEL[section.type]}
          </button>
        ))}
      </div>
      {errorMessage && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {errorMessage}
        </p>
      )}
      <Button type="submit" disabled={!name.trim() || createCategory.isPending}>
        {createCategory.isPending ? "Criando..." : "Criar categoria"}
      </Button>
    </form>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const [mode, setMode] = useState<"view" | "rename" | "archive">("view");
  const [name, setName] = useState(category.name);
  const renameCategory = useRenameCategory();
  const archiveCategory = useArchiveCategory();
  const id = category.id;

  if (mode === "rename") {
    const errorMessage = conflictMessage(renameCategory.error);
    return (
      <li className="px-1 py-1">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            renameCategory.mutate({ id, name: name.trim() }, { onSuccess: () => setMode("view") });
          }}
          className="flex flex-col gap-2 rounded-2xl bg-ink-800 p-3"
        >
          <label className="flex flex-col gap-2">
            <span className="sr-only">Novo nome de {category.name}</span>
            <input
              autoFocus
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-xl border border-line bg-ink-900 px-3 text-text outline-none focus:border-signal"
            />
          </label>
          {errorMessage && <p role="alert" className="text-sm font-semibold text-danger">{errorMessage}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!name.trim() || renameCategory.isPending}
              className="h-11 flex-1 rounded-full bg-signal font-bold text-ink-900 transition active:scale-95 disabled:opacity-60"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => {
                setName(category.name);
                setMode("view");
              }}
              className="h-11 flex-1 rounded-full bg-surface font-bold text-text transition active:scale-95"
            >
              Cancelar
            </button>
          </div>
        </form>
      </li>
    );
  }

  if (mode === "archive") {
    return (
      <li className="px-1 py-1">
        <div className="flex flex-col gap-3 rounded-2xl bg-ink-800 p-4">
          <p className="text-sm leading-snug text-text-soft">
            Arquivar <strong className="text-text">{category.name}</strong>? As transações antigas continuam no
            histórico, mas não será possível lançar novas nela, e ela sai do orçamento a partir
            deste mês.
          </p>
          {archiveCategory.error && (
            <p role="alert" className="text-sm font-semibold text-danger">{archiveCategory.error.message}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={archiveCategory.isPending}
              onClick={() => archiveCategory.mutate(id)}
              className="h-11 flex-1 rounded-full bg-warning font-bold text-[#1f1400] transition active:scale-95 disabled:opacity-60"
            >
              {archiveCategory.isPending ? "Arquivando..." : "Arquivar"}
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
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 px-3 py-1.5">
      <span className="min-w-0 flex-1 truncate font-bold">{category.name}</span>
      <button type="button" onClick={() => setMode("rename")} className="h-11 px-3 text-sm font-bold text-text-muted hover:text-text">
        Renomear
      </button>
      <button type="button" onClick={() => setMode("archive")} className="h-11 px-3 text-sm font-bold text-text-muted hover:text-warning">
        Arquivar
      </button>
    </li>
  );
}