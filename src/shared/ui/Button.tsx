import type { ButtonHTMLAttributes } from "react";

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`h-14 rounded-full bg-signal px-6 font-bold text-ink-900 transition active:scale-95 disabled:opacity-60 ${className}`}
    />
  );
}