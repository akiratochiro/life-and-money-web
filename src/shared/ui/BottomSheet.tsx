import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";

type Props = { title: string; open: boolean; onClose: () => void; children: ReactNode };

/**
 * Uma folha que sobe da base da tela, como nos apps nativos. É um <dialog> modal: o navegador
 * prende o foco nela, fecha com Esc (ou com o gesto de voltar do Android) e devolve o foco a quem
 * a abriu. Tocar fora, no fundo escurecido, também fecha. Do md para cima, onde não há polegar
 * nem base de tela para alcançar, vira um pop-up centralizado.
 */
export function BottomSheet({ title, open, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal?.();
    if (!open && dialog.open) dialog.close?.();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        // O clique no próprio <dialog> (e não no conteúdo) é um toque no fundo escurecido.
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92dvh] w-full max-w-none overflow-y-auto overscroll-contain bg-transparent p-0 text-text backdrop:bg-backdrop open:motion-safe:animate-[sheet-up_220ms_ease-out] md:inset-0 md:m-auto md:max-h-[90dvh] md:w-[min(100%-1.5rem,28rem)] md:open:motion-safe:animate-fade-in"
    >
      <div className="rounded-t-hero bg-surface px-gutter pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-card md:rounded-hero md:p-6">
        <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-track md:hidden" />
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-heading font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-sunken transition active:scale-95"
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
