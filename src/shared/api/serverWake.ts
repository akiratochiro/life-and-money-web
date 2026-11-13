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
 * - `unreachable`: o servidor não respondeu nem depois do tempo de um despertar. O aviso muda e
 *   oferece um botão, mas as tentativas continuam sozinhas, mais espaçadas: quando o servidor
 *   responder, o app segue sem precisar de F5. O botão (`retry`) só antecipa a próxima tentativa.
 */
export type ServerStatus = "checking" | "waking" | "ready" | "unreachable";

type Options = {
  /** Uma tentativa no /health: verdadeiro quando o servidor respondeu com sucesso. */
  check: () => Promise<boolean>;
  /** Quanto tempo sem resposta até mostrar o aviso. */
  slowAfterMs: number;
  /** Quanto tempo de tentativas até trocar o aviso. Um despertar do Render leva até um minuto. */
  giveUpAfterMs: number;
  /** Intervalo depois da primeira falha; dobra a cada falha seguinte, até `maxRetryDelayMs`. */
  retryDelayMs: number;
  /**
   * Teto do intervalo. Tentar a cada 2 s para sempre martelaria a Cloudflare do Render, que
   * responde a rajadas com um desafio anti-bot — e aí nenhuma tentativa passa.
   */
  maxRetryDelayMs: number;
};

export function createServerWake({ check, slowAfterMs, giveUpAfterMs, retryDelayMs, maxRetryDelayMs }: Options) {
  let status: ServerStatus = "checking";
  let ready: Promise<void> | null = null;
  let resolveReady = () => {};
  const listeners = new Set<() => void>();

  /** Início da janela atual de tentativas; o botão abre uma janela nova. */
  let windowStartedAt = 0;
  /** Falhas seguidas, para o backoff. O botão zera. */
  let failures = 0;
  /** Encerra antes da hora a espera entre duas tentativas, quando existe uma. */
  let skipWait: (() => void) | null = null;

  function setStatus(next: ServerStatus): void {
    if (status !== next) {
      status = next;
      listeners.forEach((listener) => listener());
    }
  }

  function wait(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        skipWait = null;
        resolve();
      };
      const timer = setTimeout(done, ms);
      skipWait = done;
    });
  }

  /** Um único laço por página: só termina quando o servidor responde. */
  async function poll(): Promise<void> {
    windowStartedAt = Date.now();
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
        if (Date.now() - windowStartedAt >= giveUpAfterMs) {
          setStatus("unreachable");
        }
        await wait(Math.min(retryDelayMs * 2 ** failures, maxRetryDelayMs));
        failures++;
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
     * tentativas: quem espera por ela (a renovação da sessão) só segue quando ele de fato responder.
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

    /**
     * O botão do aviso: volta para "acordando", zera o backoff e tenta já, se o laço estiver
     * esperando. Se uma tentativa já estiver em andamento, é ela que vale: duas ao mesmo tempo só
     * somariam pedidos.
     */
    retry(): void {
      if (status !== "unreachable") return;
      windowStartedAt = Date.now();
      failures = 0;
      setStatus("waking");
      skipWait?.();
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
  maxRetryDelayMs: 15_000,
});
