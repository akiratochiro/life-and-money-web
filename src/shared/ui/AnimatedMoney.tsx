import { usePrivacy } from "../privacy/privacyContext";
import { Money } from "./Money";
import { useCountUp } from "./useCountUp";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Um valor em reais que conta até o número certo. O leitor de tela lê só o valor final: os
 * números intermediários ficam escondidos dele. Com os valores ocultos, não há o que animar.
 */
export function AnimatedMoney({ value, className = "" }: { value: number; className?: string }) {
  const { hidden } = usePrivacy();
  const shown = useCountUp(value, !hidden);

  if (hidden) return <Money value={value} className={className} />;
  return (
    <span className={`tabular-nums ${className}`}>
      <span aria-hidden="true">{brl.format(shown)}</span>
      <span className="sr-only">{brl.format(value)}</span>
    </span>
  );
}
