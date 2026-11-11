import { useId } from "react";
import { digitsToInt, formatCents } from "../../shared/lib/money";

const MAX_CENTS = 99_999_999_999;

type Props = { label: string; cents: number; onChange: (cents: number) => void; error?: string; hint?: string };

/**
 * Dinheiro num formulário com vários valores. O AmountInput é o valor em destaque de uma tela; aqui
 * são até dez valores juntos, então o campo tem o tamanho de um campo comum. A regra é a mesma:
 * guarda centavos, e cada dígito empurra os anteriores (decisão 3).
 */
export function MoneyField({ label, cents, onChange, error, hint }: Props) {
  const messageId = useId();
  const message = error ?? hint;
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-muted">{label}</span>
        <input
          inputMode="decimal"
          autoComplete="off"
          value={formatCents(cents)}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          onChange={(event) => onChange(digitsToInt(event.target.value, MAX_CENTS))}
          className="h-14 rounded-2xl border border-line bg-sunken px-4 text-base tabular-nums text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 aria-invalid:border-danger"
        />
      </label>
      {message && (
        <span id={messageId} className={error ? "text-sm font-semibold text-danger-strong" : "text-sm text-text-muted"}>
          {message}
        </span>
      )}
    </div>
  );
}
