import { usePrivacy } from "../privacy/PrivacyProvider";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Props = { value: number; className?: string };

export function Money({ value, className = "" }: Props) {
  const { hidden } = usePrivacy();
  return <span className={`tabular-nums ${className}`}>{hidden ? "R$ ••••" : brl.format(value)}</span>;
}