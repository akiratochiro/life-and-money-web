import type { ReactNode } from "react";

/** Fundo suave e tom forte: o par que passa contraste no tema claro. */
const tones = {
  danger: "bg-danger-soft text-danger-strong",
  warning: "bg-warning-soft text-warning-strong",
  saving: "bg-saving-soft text-saving-strong",
  income: "bg-income-soft text-income-strong",
};

export type BadgeTone = keyof typeof tones;

type Props = { tone: BadgeTone; children: ReactNode };

export function Badge({ tone, children }: Props) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide shadow-clay-sm ${tones[tone]}`}>
      {children}
    </span>
  );
}
