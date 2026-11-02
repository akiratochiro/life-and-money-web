import type { ReactNode } from "react";

type Props = { pending: boolean; pendingText: string; children: ReactNode };

/**
 * O conteúdo de um botão que envia algo. Durante o envio, o texto fica invisível mas continua
 * ocupando o espaço, e o spinner aparece por cima: o botão não muda de largura. Para leitor de
 * tela, o nome do botão passa a ser o texto de espera ("Salvando…"), que anuncia o estado.
 */
export function PendingLabel({ pending, pendingText, children }: Props) {
  return (
    <span className="relative inline-flex items-center justify-center">
      <span className={pending ? "invisible" : undefined} aria-hidden={pending || undefined}>
        {children}
      </span>
      {pending && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
          <span className="sr-only">{pendingText}</span>
        </span>
      )}
    </span>
  );
}

export function Spinner() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="animate-spin motion-reduce:animate-[spin_1.5s_linear_infinite]"
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
