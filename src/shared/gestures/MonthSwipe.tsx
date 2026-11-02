import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import { m } from "motion/react";
import { addMonths } from "../lib/dates";
import { DURATION } from "../ui/motion";
import { startsAtEdge, swipeDirection } from "./gestures";

type Props = { month: string; onChange: (month: string) => void; children: ReactNode };

/**
 * Arrastar para o lado troca o mês: para a esquerda, o próximo; para a direita, o anterior, como
 * virar a página. O conteúdo do mês novo entra pelo lado de onde veio. É um atalho para o toque:
 * o MonthSwitcher continua sendo o caminho para teclado e leitor de tela.
 */
export function MonthSwipe({ month, onChange, children }: Props) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const [from, setFrom] = useState(0);

  function onTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    start.current = touch && !startsAtEdge(touch.clientX, window.innerWidth) ? { x: touch.clientX, y: touch.clientY } : null;
  }

  function onTouchEnd(event: TouchEvent) {
    const origin = start.current;
    const touch = event.changedTouches[0];
    start.current = null;
    if (!origin || !touch) return;
    const direction = swipeDirection(touch.clientX - origin.x, touch.clientY - origin.y);
    if (!direction) return;
    setFrom(direction === "left" ? 1 : -1);
    onChange(addMonths(month, direction === "left" ? 1 : -1));
  }

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} data-month-swipe>
      <m.div
        key={month}
        initial={from === 0 ? false : { opacity: 0, x: from * 32 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: DURATION.base }}
      >
        {children}
      </m.div>
    </div>
  );
}
