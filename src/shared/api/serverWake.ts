import { API_BASE } from "./base";

/**
 * A API roda no plano gratuito do Render, que hiberna depois de um tempo sem requisições. A
 * primeira chamada depois disso pode levar de 30 a 60 segundos, e sem aviso isso parece erro.
 *
 * Este módulo bate no /health ao abrir o app e expõe em que pé está o servidor:
 *
 * - `checking`: a primeira tentativa saiu e ainda não voltou. Na maioria das vezes a API já está
 *   acordada e responde rápido, então nada aparece na tela;
 * - `waking`: passou o tempo de uma resposta normal e ela não veio. É quando o aviso aparece;
 * - `ready`: o /health respondeu. Daqui em diante o app segue normalmente;
 * - `unreachable`: o servidor não respondeu nem depois do tempo de um despertar. Só uma ação do
 *   usuário (`retry`) recomeça as tentativas.
 */
export type ServerStatus = "checking" | "waking" | "ready" | "unreachable";

type Options = {
  /** Uma tentativa no /health: verdadeiro quando o servidor respondeu com sucesso. */
  check: () => Promise<boolean>;
  /** Quanto tempo sem resposta até mostrar o aviso. */
  slowAfterMs: number;
  /** Quanto tempo de tentativas até desistir. Um despertar do Render leva até um minuto. */
  giveUpAfterMs: number;
  /** Intervalo entre uma tentativa que falhou e a próxima. */
  retryDelayMs: number;
};

export type ServerWake = ReturnType<typeof createServerWake>;

export function createServerWake({ check, slowAfterMs, giveUpAfterMs, retryDelayMs }: Options) {
  let status: ServerStatus = "checking";
  let ready: Promise<void> | null = null;
  let resolveReady = () => {};
  const listeners = new Set<() => void>();

  function setStatus(next: ServerStatus): void {
    if (status !== next) {
      status = next;
      listeners.forEach((listener) => listener());
    }
  }

  async function poll(): Promise<void> {
    const startedAt = Date.now();
    setStatus("checking");
    const slow = setTimeout(() => {
      if (status === "checking") setStatus("waking");
    }, slowAfterMs);

    try {
      for (;;) {
        if (await check()) {
          setStatus("ready");
          resolveReady();
          return;
        }
        if (Date.now() - startedAt >= giveUpAfterMs) {
          setStatus("unreachable");
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    } finally {
      clearTimeout(slow);
    }
  }

  return {
    getStatus: (): ServerStatus => status,

    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /**
     * Resolve quando o servidor estiver de pé. Chamadas repetidas compartilham as mesmas
     * tentativas, e a promessa continua pendente enquanto o servidor estiver `unreachable`: quem
     * espera por ela (a renovação da sessão) só segue quando ele de fato responder.
     */
    waitUntilReady(): Promise<void> {
      if (ready === null) {
        ready = new Promise<void>((resolve) => {
          resolveReady = resolve;
        });
        void poll();
      }
      return ready;
    },

    /** Recomeça as tentativas depois de uma desistência. */
    retry(): void {
      if (status === "unreachable") void poll();
    },
  };
}

/** Uma tentativa sem resposta em 15 s é abandonada e refeita, em vez de ficar pendurada. */
const HEALTH_TIMEOUT_MS = 15_000;

async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    // Rede fora, timeout ou o proxy sem conseguir falar com a API: o servidor não está de pé.
    return false;
  }
}

export const serverWake = createServerWake({
  check: checkHealth,
  slowAfterMs: 2_000,
  giveUpAfterMs: 90_000,
  retryDelayMs: 2_000,
});
