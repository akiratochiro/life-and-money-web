import { useCallback, useState, type CSSProperties, type ReactNode } from "react";
import { CelebrateContext } from "./celebrateContext";

export const CONFETTI_MS = 1_600;
export const CONFETTI_PIECES = 36;

const COLORS = [
  "var(--color-pig-300)",
  "var(--color-pig-100)",
  "var(--color-cat-mint)",
  "var(--color-cat-lime)",
  "var(--color-cat-sky)",
  "var(--color-cat-amber)",
];

type Piece = { id: number; style: CSSProperties; round: boolean };

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/** Uma rajada: cada peça sai do topo da tela para uma direção, girando, e some. */
function burst(seed: number): Piece[] {
  return Array.from({ length: CONFETTI_PIECES }, (_, index) => {
    const angle = (index / CONFETTI_PIECES) * Math.PI * 2 + Math.random() * 0.4;
    const distance = 120 + Math.random() * 160;
    return {
      id: seed * 1000 + index,
      round: index % 3 === 0,
      style: {
        background: COLORS[index % COLORS.length],
        "--dx": `${Math.cos(angle) * distance}px`,
        // Mais para baixo do que para cima: o confete cai.
        "--dy": `${Math.sin(angle) * distance * 0.6 + 140}px`,
        "--spin": `${(Math.random() - 0.5) * 720}deg`,
        animationDelay: `${Math.random() * 120}ms`,
      } as CSSProperties,
    };
  });
}

/**
 * Um confete leve para quando uma meta é atingida: 36 peças em CSS (transform e opacity), sem
 * biblioteca, que somem sozinhas. Quem pediu menos movimento não vê o confete; o aviso de meta
 * atingida continua chegando pelo toast.
 */
export function CelebrateProvider({ children }: { children: ReactNode }) {
  const [bursts, setBursts] = useState<{ id: number; pieces: Piece[] }[]>([]);

  const celebrate = useCallback(() => {
    if (prefersReducedMotion()) return;
    const id = Date.now();
    setBursts((current) => [...current, { id, pieces: burst(id) }]);
    setTimeout(() => setBursts((current) => current.filter((item) => item.id !== id)), CONFETTI_MS);
  }, []);

  return (
    <CelebrateContext.Provider value={celebrate}>
      {children}
      {bursts.length > 0 && (
        <div aria-hidden="true" data-confetti className="pointer-events-none fixed inset-x-0 top-24 z-50 flex justify-center">
          {bursts.flatMap((item) =>
            item.pieces.map((piece) => (
              <span
                key={piece.id}
                className={`absolute h-2.5 w-1.5 animate-confetti ${piece.round ? "rounded-full" : "rounded-sm"}`}
                style={piece.style}
              />
            )),
          )}
        </div>
      )}
    </CelebrateContext.Provider>
  );
}
