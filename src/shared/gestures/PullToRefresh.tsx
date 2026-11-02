import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PULL_THRESHOLD, pullDistance, pullReady } from "./gestures";
import { Spinner } from "../ui/PendingLabel";

/**
 * Puxar para baixo, com a página no topo, recarrega o que está na tela. O indicador acompanha o
 * dedo com resistência; soltar depois do limite atualiza. O pull-to-refresh nativo, que
 * recarregaria o app inteiro, está desligado no CSS (overscroll-behavior).
 *
 * Só existe no toque. No teclado e no mouse, os dados já se atualizam ao voltar para a aba.
 */
export function PullToRefresh({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const startY = useRef<number | null>(null);
  const [dy, setDy] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  function onTouchStart(event: TouchEvent) {
    // Só no topo da página: no meio dela, arrastar para baixo é rolar.
    startY.current = window.scrollY <= 0 && !refreshing ? (event.touches[0]?.clientY ?? null) : null;
  }

  function onTouchMove(event: TouchEvent) {
    if (startY.current === null) return;
    setDy((event.touches[0]?.clientY ?? startY.current) - startY.current);
  }

  async function onTouchEnd() {
    if (startY.current === null) return;
    startY.current = null;
    const ready = pullReady(dy);
    setDy(0);
    if (!ready) return;
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ type: "active" });
    } finally {
      setRefreshing(false);
    }
  }

  const distance = refreshing ? PULL_THRESHOLD : pullDistance(dy);
  const progress = Math.min(distance / PULL_THRESHOLD, 1);

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
      <div aria-hidden={!refreshing} className="pointer-events-none relative h-0">
        <div
          className="absolute inset-x-0 -top-2 flex justify-center"
          style={{ transform: `translateY(${distance - 40}px)`, opacity: progress, transition: dy ? "none" : "transform 200ms, opacity 200ms" }}
        >
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-accent shadow-clay-sm"
            style={{ transform: refreshing ? undefined : `rotate(${progress * 270}deg)` }}
          >
            {refreshing ? <Spinner /> : <ArrowDown />}
          </span>
        </div>
        {refreshing && <span role="status" className="sr-only">Atualizando…</span>}
      </div>
      <div style={{ transform: `translateY(${distance}px)`, transition: dy ? "none" : "transform 200ms" }}>{children}</div>
    </div>
  );
}

function ArrowDown() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}
