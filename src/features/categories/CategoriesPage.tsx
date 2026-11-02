import { useState, type FormEvent } from "react";
import {
  useArchiveCategory,
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  categoryErrorMessage,
  type Category,
  type CategoryType,
} from "./categoriesApi";
import { TextField } from "../../shared/ui/TextField";
import { Button } from "../../shared/ui/Button";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { CategoriesSkeleton } from "./CategoriesSkeleton";
import { CategoryLookPicker } from "./CategoryLookPicker";
import { DEFAULT_LOOK } from "./categoryLook";
import { CategoryTile } from "./CategoryGlyph";

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
        <CategoriesSkeleton />
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
                <li key={category.id} className="flex items-center gap-3 px-3 py-3 text-text-muted">
                  <span className="opacity-60">
                    <CategoryTile color={category.color} icon={category.icon} size="sm" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{category.name}</span>
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
  const [look, setLook] = useState(DEFAULT_LOOK.EXPENSE);
  // Enquanto o usuário não escolhe cor e ícone, eles seguem o padrão do tipo.
  const [lookTouched, setLookTouched] = useState(false);

  function changeType(next: CategoryType) {
    setType(next);
    if (!lookTouched) setLook(DEFAULT_LOOK[next]);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    createCategory.mutate(
      { name: name.trim(), type, ...look },
      {
        onSuccess: () => {
          setName("");
          setLookTouched(false);
          setLook(DEFAULT_LOOK[type]);
        },
      },
    );
  }

  const errorMessage = categoryErrorMessage(createCategory.error);

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
      <div role="group" aria-label="Tipo da categoria" className="grid grid-cols-3 gap-1 rounded-full bg-sunken p-1">
        {SECTIONS.map((section) => (
          <button
            key={section.type}
            type="button"
            aria-pressed={type === section.type}
            onClick={() => changeType(section.type)}
            className={`flex h-11 items-center justify-center gap-2 rounded-full text-sm font-bold transition active:scale-95 ${
              type === section.type ? "bg-surface text-text shadow-clay-sm" : "text-text-muted"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${section.dot}`} />
            {TYPE_LABEL[section.type]}
          </button>
        ))}
      </div>
      <CategoryLookPicker
        color={look.color}
        icon={look.icon}
        onChange={(next) => {
          setLook(next);
          setLookTouched(true);
        }}
      />
      {errorMessage && (
        <p role="alert" className="text-sm font-semibold text-danger-strong">
          {errorMessage}
        </p>
      )}
      <Button type="submit" disabled={!name.trim() || createCategory.isPending}>
        <PendingLabel pending={createCategory.isPending} pendingText="Criando…">Criar categoria</PendingLabel>
      </Button>
    </form>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const [mode, setMode] = useState<"view" | "edit" | "archive">("view");
  const [name, setName] = useState(category.name);
  const [look, setLook] = useState({ color: category.color, icon: category.icon });
  const updateCategory = useUpdateCategory();
  const archiveCategory = useArchiveCategory();
  const id = category.id;

  if (mode === "edit") {
    const errorMessage = categoryErrorMessage(updateCategory.error);
    const cancel = () => {
      setName(category.name);
      setLook({ color: category.color, icon: category.icon });
      setMode("view");
    };
    return (
      <li className="px-1 py-1">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            // Só manda o que mudou: o PATCH é parcial.
            const trimmed = name.trim();
            updateCategory.mutate(
              {
                id,
                body: {
                  name: trimmed !== category.name ? trimmed : undefined,
                  color: look.color !== category.color ? look.color : undefined,
                  icon: look.icon !== category.icon ? look.icon : undefined,
                },
              },
              { onSuccess: () => setMode("view") },
            );
          }}
          className="flex flex-col gap-4 rounded-2xl bg-sunken p-3"
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-text-muted">Nome</span>
            <input
              autoFocus
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-control border border-line bg-surface px-3 text-text outline-none focus:border-accent"
            />
          </label>
          <CategoryLookPicker color={look.color} icon={look.icon} onChange={setLook} />
          {errorMessage && <p role="alert" className="text-sm font-semibold text-danger-strong">{errorMessage}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={
                !name.trim() ||
                updateCategory.isPending ||
                (name.trim() === category.name && look.color === category.color && look.icon === category.icon)
              }
              className="h-11 flex-1 rounded-full bg-accent font-bold text-on-accent shadow-clay-accent transition active:scale-95 disabled:opacity-60"
            >
              <PendingLabel pending={updateCategory.isPending} pendingText="Salvando…">Salvar</PendingLabel>
            </button>
            <button
              type="button"
              onClick={cancel}
              className="h-11 flex-1 rounded-full bg-surface font-bold text-text shadow-clay-sm transition active:scale-95"
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
        <div className="flex flex-col gap-3 rounded-2xl bg-sunken p-4">
          <p className="text-sm leading-snug text-text-soft">
            Arquivar <strong className="text-text">{category.name}</strong>? As transações antigas continuam no
            histórico, mas não será possível lançar novas nela, e ela sai do orçamento a partir
            deste mês.
          </p>
          <div className="flex gap-2">
            {/* Otimista: a categoria vai para as arquivadas na hora; um erro a traz de volta com um aviso. */}
            <button
              type="button"
              onClick={() => archiveCategory.mutate(id)}
              className="h-11 flex-1 rounded-full bg-warning font-bold text-text transition active:scale-95"
            >
              Arquivar
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
    <li className="flex items-center gap-3 px-3 py-1.5">
      <CategoryTile color={category.color} icon={category.icon} size="sm" />
      <span className="min-w-0 flex-1 truncate font-bold">{category.name}</span>
      <button type="button" onClick={() => setMode("edit")} className="h-11 px-3 text-sm font-bold text-text-muted hover:text-text">
        Editar
      </button>
      <button type="button" onClick={() => setMode("archive")} className="h-11 px-3 text-sm font-bold text-text-muted hover:text-warning-strong">
        Arquivar
      </button>
    </li>
  );
}