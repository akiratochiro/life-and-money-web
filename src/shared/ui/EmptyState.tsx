import type { ReactNode } from "react";
import { FloatingShapes } from "../brand/FloatingShapes";

/**
 * Quando ainda não há nada para mostrar. É um dos dois lugares (com o login) onde as formas
 * flutuantes aparecem: aqui não há número para elas atrapalharem.
 */
export function EmptyState({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="relative flex flex-col items-start gap-3 overflow-hidden rounded-card border border-dashed border-line bg-surface/60 p-card pr-20">
      <FloatingShapes variant="empty" />
      <div className="relative text-sm leading-snug text-text-soft">{children}</div>
      {action && <div className="relative">{action}</div>}
    </div>
  );
}
