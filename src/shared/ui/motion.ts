/** Durações curtas (150 a 250 ms): movimento que confirma uma ação, não que faz esperar. */
export const DURATION = { fast: 0.15, base: 0.2, slow: 0.25 } as const;

/**
 * Entrada e saída de um item de lista: aparece subindo 6 px e sai subindo 4 px. Usado com
 * `<AnimatePresence initial={false}>`, que não anima o que já estava lá quando a lista montou:
 * o primeiro lote aparece direto (a troca do skeleton pelo conteúdo já é a transição, e animar
 * ali atrasaria o LCP), e o que entra ou sai depois, como uma transação otimista, anima.
 */
export const listItem = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4, transition: { duration: DURATION.fast } },
  transition: { duration: DURATION.base },
} as const;

/** Entrada de página ao navegar: um fade curto com 8 px de subida. Sem saída, de propósito. */
export const pageEnter = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DURATION.slow },
} as const;
