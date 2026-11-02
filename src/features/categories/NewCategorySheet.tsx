import { useEffect, useRef, useState, type FormEvent } from "react";
import { categoryErrorMessage, useCreateCategory, type Category, type CategoryType } from "./categoriesApi";
import { CategoryLookPicker } from "./CategoryLookPicker";
import { DEFAULT_LOOK } from "./categoryLook";
import { BottomSheet } from "../../shared/ui/BottomSheet";
import { TextField } from "../../shared/ui/TextField";
import { Button } from "../../shared/ui/Button";
import { PendingLabel } from "../../shared/ui/PendingLabel";

const TITLE: Record<CategoryType, string> = {
  EXPENSE: "Nova categoria de despesa",
  INCOME: "Nova categoria de receita",
  SAVING: "Nova categoria de poupança",
};

type Props = {
  /**
   * O tipo vem do formulário que abriu a folha: quem lança uma saída quer uma categoria de saída.
   * Quem usa a folha a remonta (key) quando o tipo muda, para a cor e o ícone padrão acompanharem.
   */
  type: CategoryType;
  open: boolean;
  onClose: () => void;
  onCreated: (category: Category) => void;
};

/**
 * Criar uma categoria sem sair da transação. Não é otimista de propósito: o nome pode ser
 * recusado (409, já existe), e a transação precisa do id de verdade para ser salva.
 */
export function NewCategorySheet({ type, open, onClose, onCreated }: Props) {
  const createCategory = useCreateCategory();
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [look, setLook] = useState(DEFAULT_LOOK[type]);

  // O <dialog> já foi aberto pelo efeito da BottomSheet (o efeito do filho roda antes): o foco
  // vai para o nome, e não para o botão de fechar, que é o primeiro da folha.
  useEffect(() => {
    if (open) nameRef.current?.focus();
  }, [open]);

  /** Fechar descarta o rascunho: a próxima abertura começa limpa, com o padrão do tipo. */
  function close() {
    setName("");
    setLook(DEFAULT_LOOK[type]);
    createCategory.reset();
    onClose();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // Garantia: um <form> dentro de outro não envia os dois, mesmo que alguém mova a folha.
    event.stopPropagation();
    createCategory.mutate(
      { name: name.trim(), type, ...look },
      {
        onSuccess: (created) => {
          onCreated(created);
          close();
        },
      },
    );
  }

  const errorMessage = categoryErrorMessage(createCategory.error);

  return (
    <BottomSheet title={TITLE[type]} open={open} onClose={close}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
        <TextField
          ref={nameRef}
          label="Nome"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={type === "INCOME" ? "Ex.: Freelance" : "Ex.: Academia"}
          enterKeyHint="done"
        />
        <CategoryLookPicker color={look.color} icon={look.icon} onChange={setLook} />
        {errorMessage && (
          <p role="alert" className="text-sm font-semibold text-danger-strong">
            {errorMessage}
          </p>
        )}
        <Button type="submit" disabled={!name.trim() || createCategory.isPending}>
          <PendingLabel pending={createCategory.isPending} pendingText="Criando…">Criar e usar</PendingLabel>
        </Button>
      </form>
    </BottomSheet>
  );
}
