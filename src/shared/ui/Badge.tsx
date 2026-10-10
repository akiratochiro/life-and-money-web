import type { ReactNode } from "react";

const tones = {
  danger: "bg-danger text-[#1a0710]",
  warning: "bg-warning text-[#1f1400]",
  saving: "bg-saving-soft text-[#0a1233]",
  income: "bg-income text-[#04252a]",
};

type Props = { tone: keyof typeof tones; children: ReactNode };

export function Badge({ tone, children }: Props) {
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}