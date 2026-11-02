import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { ToastContext, type Toast, type ToastTone } from "./toastContext";
import { CloseIcon } from "../ui/icons";
import { AnimatePresence, m } from "motion/react";
import { listItem } from "../ui/motion";

/** Tempo na tela: o suficiente para ler uma frase de erro com calma. */
export const TOAST_DURATION_MS = 6_000;

/**
 * Avisos curtos que não interrompem o que o usuário está fazendo. O principal uso é a
 * atualização otimista: a tela já mudou, o servidor recusou, a mudança foi desfeita, e o toast
 * conta o porquê.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = "info") => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, message, tone }]);
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Fica acima da barra de navegação do celular. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6">
        <AnimatePresence>
          {toasts.map((toast) => (
            <m.div
              key={toast.id}
              {...listItem}
              role={toast.tone === "error" ? "alert" : "status"}
              className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-card ${
                toast.tone === "error" ? "bg-danger-strong text-on-accent" : "bg-surface-raised text-text"
              }`}
            >
              <p className="flex-1 leading-snug">{toast.message}</p>
              <button
                type="button"
                aria-label="Fechar aviso"
                onClick={() => dismiss(toast.id)}
                className="-m-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition active:scale-95"
              >
                <CloseIcon width={16} height={16} />
              </button>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
