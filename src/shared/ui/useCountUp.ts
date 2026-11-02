import { useEffect, useRef, useState } from "react";

/** Mais longo que uma transição (150 a 250 ms): uma contagem curta demais só parece um salto. */
export const COUNT_UP_MS = 500;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * Conta do último valor mostrado até o novo: de zero na primeira vez, e do valor anterior quando
 * ele muda (uma transação nova, por exemplo). Trabalha em centavos inteiros, para nunca mostrar
 * um valor quebrado como R$ 10,333. Sem animação (desligada ou movimento reduzido), devolve o
 * valor final direto.
 */
export function useCountUp(target: number, enabled = true): number {
  const targetCents = Math.round(target * 100);
  const animate = enabled && !prefersReducedMotion();
  const [shown, setShown] = useState(animate ? 0 : targetCents);
  // O último valor desenhado; só é escrito dentro do efeito e dos quadros de animação.
  const last = useRef(animate ? 0 : targetCents);

  useEffect(() => {
    if (!animate) {
      last.current = targetCents;
      return;
    }
    const from = last.current;
    if (from === targetCents) return;

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / COUNT_UP_MS, 1);
      const value = Math.round(from + (targetCents - from) * easeOutCubic(progress));
      last.current = value;
      setShown(value);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [targetCents, animate]);

  return (animate ? shown : targetCents) / 100;
}
