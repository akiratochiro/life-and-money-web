import type { ButtonHTMLAttributes } from "react";

/**
 * A ação primária da tela: a única que usa o destaque. Tem volume de argila, e ao ser
 * pressionada a sombra afunda para dentro, como quem aperta massinha.
 */
export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`h-14 rounded-full bg-accent px-6 font-bold text-on-accent shadow-clay-accent transition active:scale-[0.97] active:shadow-clay-pressed disabled:opacity-60 ${className}`}
    />
  );
}
