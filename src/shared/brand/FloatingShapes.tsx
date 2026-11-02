import type { CSSProperties } from "react";
import { Coin, PigFace } from "./illustrations";

type Shape = { kind: "coin" | "pig" | "blob"; className: string; style: CSSProperties };

/**
 * Formas que flutuam devagar atrás do conteúdo: moedas, rostos de porco e manchas de argila.
 *
 * - só no login e nos estados vazios, nunca atrás de números (um valor que se mexe por trás
 *   atrapalha a leitura);
 * - baixa opacidade e movimento lento, só com transform (a animação "float" do tema), que o
 *   navegador compõe sem refazer layout nem pintura;
 * - com prefers-reduced-motion, ficam paradas (motion-safe);
 * - invisíveis para leitor de tela e para o mouse.
 */
const SETS: Record<"login" | "empty", Shape[]> = {
  login: [
    { kind: "blob", className: "-left-16 -top-10 h-56 w-56 bg-pig-100", style: { animationDuration: "14s" } },
    { kind: "blob", className: "-bottom-20 -right-10 h-64 w-64 bg-cat-mint-soft", style: { animationDuration: "16s", animationDelay: "-4s" } },
    { kind: "coin", className: "left-[8%] top-[18%] h-12 w-12 opacity-30", style: { animationDuration: "10s" } },
    { kind: "pig", className: "right-[10%] top-[12%] h-14 w-14 opacity-25", style: { animationDuration: "12s", animationDelay: "-3s" } },
    { kind: "coin", className: "bottom-[14%] left-[14%] h-9 w-9 opacity-25", style: { animationDuration: "9s", animationDelay: "-6s" } },
    { kind: "coin", className: "bottom-[22%] right-[16%] h-10 w-10 opacity-20", style: { animationDuration: "11s", animationDelay: "-2s" } },
  ],
  empty: [
    { kind: "coin", className: "-right-2 top-2 h-12 w-12 opacity-20", style: { animationDuration: "10s" } },
    { kind: "pig", className: "bottom-1 right-14 h-9 w-9 opacity-15", style: { animationDuration: "12s", animationDelay: "-5s" } },
  ],
};

export function FloatingShapes({ variant }: { variant: "login" | "empty" }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {SETS[variant].map((shape, index) => {
        const className = `absolute motion-safe:animate-float ${shape.className}`;
        if (shape.kind === "blob") {
          return <span key={index} className={`${className} rounded-full opacity-70 blur-2xl`} style={shape.style} />;
        }
        const Icon = shape.kind === "coin" ? Coin : PigFace;
        return <Icon key={index} className={className} style={shape.style} data-shape={shape.kind} />;
      })}
    </div>
  );
}
