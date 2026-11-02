import type { ReactNode } from "react";

/**
 * Um pedaço de skeleton. `on` diz sobre o que ele está: na página (bg-ink-900) o osso é
 * bg-surface; dentro de um card (bg-surface), é bg-ink-800. O pulso só acontece para quem não
 * pediu movimento reduzido.
 */
export function Bone({ className = "", on = "card" }: { className?: string; on?: "page" | "card" }) {
  return (
    <span
      aria-hidden="true"
      className={`block motion-safe:animate-pulse ${on === "page" ? "bg-surface" : "bg-ink-800"} ${className}`}
    />
  );
}

/** Agrupa um skeleton e diz a leitores de tela que o conteúdo está carregando. */
export function SkeletonGroup({ label = "Carregando", className = "", children }: {
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div aria-busy="true" aria-label={label} role="status" className={className}>
      {children}
    </div>
  );
}
