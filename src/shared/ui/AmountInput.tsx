import { digitsToInt, formatCents } from "../lib/money";

const MAX_CENTS = 99_999_999_999;

type Props = {
  cents: number;
  onChange: (cents: number) => void;
  label: string;
  autoFocus?: boolean;
};

/**
 * O teclado é o decimal (inputmode="decimal"): só números e a vírgula, no tamanho grande do iOS
 * e do Android. O campo continua guardando centavos (decisão 3): cada dígito empurra os
 * anteriores para a esquerda, a vírgula é ignorada, e o valor formatado aparece a cada tecla.
 */
export function AmountInput({ cents, onChange, label, autoFocus = false }: Props) {
  return (
    <label className="flex flex-col items-center gap-2">
      <span className="text-sm font-semibold text-text-muted">{label}</span>
      <input
        inputMode="decimal"
        enterKeyHint="next"
        autoFocus={autoFocus}
        autoComplete="off"
        value={formatCents(cents)}
        onChange={(event) => onChange(digitsToInt(event.target.value, MAX_CENTS))}
        className="w-full bg-transparent text-center font-display text-5xl font-bold tracking-tight tabular-nums text-text outline-none"
      />
    </label>
  );
}