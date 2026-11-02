/** A distância mínima, em px, para um arrasto lateral contar como swipe. */
export const SWIPE_MIN = 56;
/** Quanto o movimento precisa ser mais horizontal que vertical: abaixo disso, é rolagem. */
export const SWIPE_RATIO = 1.5;
/** Toques que começam colados na borda são do sistema (o "voltar" do iOS), não do app. */
export const EDGE_GUARD = 24;

export type SwipeDirection = "left" | "right";

/** Para que lado foi o swipe, ou null se o movimento foi curto ou mais vertical que lateral. */
export function swipeDirection(dx: number, dy: number): SwipeDirection | null {
  if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return null;
  return dx < 0 ? "left" : "right";
}

export function startsAtEdge(x: number, viewportWidth: number): boolean {
  return x < EDGE_GUARD || x > viewportWidth - EDGE_GUARD;
}

/** O quanto o indicador desce: metade do arrasto (resistência), com teto. */
export const PULL_MAX = 96;
/** A partir daqui, soltar atualiza. */
export const PULL_THRESHOLD = 64;

export function pullDistance(dy: number): number {
  return dy <= 0 ? 0 : Math.min(dy * 0.5, PULL_MAX);
}

export function pullReady(dy: number): boolean {
  return pullDistance(dy) >= PULL_THRESHOLD;
}
