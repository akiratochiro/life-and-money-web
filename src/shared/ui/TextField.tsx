import { useId, type InputHTMLAttributes, type Ref } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Mensagem de erro: marca o campo como inválido, em vermelho. */
  error?: string;
  /** Orientação neutra, como uma regra do campo. Some quando há erro, que ocupa o lugar dela. */
  hint?: string;
  ref?: Ref<HTMLInputElement>;
};

export function TextField({ label, error, hint, ...props }: Props) {
  const messageId = useId();
  const message = error ?? hint;

  // A mensagem fica fora do <label>: dentro dele, entraria no nome do campo ("Senha Mínimo de 8
  // caracteres"). Ela chega ao leitor de tela pelo aria-describedby, como descrição.
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-muted">{label}</span>
        <input
          {...props}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className="h-14 rounded-2xl border border-line bg-sunken px-4 text-base text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 aria-invalid:border-danger"
        />
      </label>
      {error ? (
        <span id={messageId} className="text-sm font-semibold text-danger-strong">
          {error}
        </span>
      ) : (
        hint && (
          <span id={messageId} className="text-sm text-text-muted">
            {hint}
          </span>
        )
      )}
    </div>
  );
}
