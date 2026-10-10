import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      {...props}
      className={`rounded-card bg-surface p-5 shadow-card transition active:scale-[0.985] ${className}`}
    />
  );
}