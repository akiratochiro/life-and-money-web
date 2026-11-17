/**
 * Worker do front: os arquivos estáticos saem direto da camada de assets, e só /api/* passa por
 * aqui (ver `run_worker_first` no wrangler.jsonc).
 *
 * O proxy existe para deixar o front e a API na mesma origem. Com a API em outro domínio, o
 * cookie de refresh seria de terceiros, e o Safari — e com ele todo navegador do iPhone —
 * bloqueia cookies de terceiros por padrão: a sessão cairia a cada recarregamento.
 */

type Env = {
  /** Origem da API no Render, sem barra no final. */
  API_ORIGIN: string;
  /** Prova para a API que o X-Client-IP veio deste Worker. Secret do Worker, nunca no código. */
  PROXY_SHARED_SECRET?: string;
  /**
   * Deploy Hook do serviço no Render (Settings → Deploy Hook). Secret do Worker, nunca no código:
   * quem tem a URL dispara um deploy. Sem ele, o cron só mantém a API acordada.
   */
  RENDER_DEPLOY_HOOK_URL?: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
};

/** O pedaço do contexto do Workers que o cron usa: segurar o evento até a promessa terminar. */
type ExecutionContext = { waitUntil(promise: Promise<unknown>): void };

/**
 * Prepara os cabeçalhos que vão para a API com o IP real do usuário, para os limites de tentativas.
 *
 * Numa chamada deste Worker para o Render, a Cloudflare troca o CF-Connecting-IP por um endereço
 * fixo dela, o mesmo para todos os usuários. Então o IP que este Worker recebeu (aqui, sim, o do
 * navegador) segue em X-Client-IP, com o segredo em X-Proxy-Auth. Qualquer versão desses dois que
 * o navegador tenha mandado é descartada antes: o cliente não pode escolher o próprio IP.
 */
export function upstreamHeaders(request: Request, proxySecret: string | undefined): Headers {
  const headers = new Headers(request.headers);
  headers.delete("X-Client-IP");
  headers.delete("X-Proxy-Auth");

  const clientIp = request.headers.get("CF-Connecting-IP");
  if (clientIp && proxySecret) {
    headers.set("X-Client-IP", clientIp);
    headers.set("X-Proxy-Auth", proxySecret);
  }
  return headers;
}

/** O caminho vai como está: a API também responde sob /api, então nada é reescrito. */
export function upstreamUrl(requestUrl: string, apiOrigin: string): string {
  const { pathname, search } = new URL(requestUrl);
  return new URL(pathname + search, apiOrigin).toString();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!new URL(request.url).pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // Método, headers (Cookie, Authorization, X-Refresh-Request) e corpo seguem iguais, mais o IP
    // do usuário. Um redirecionamento da API volta para o navegador em vez de ser seguido aqui.
    try {
      const upstream = new Request(upstreamUrl(request.url, env.API_ORIGIN), request);
      const response = await fetch(
        new Request(upstream, { headers: upstreamHeaders(request, env.PROXY_SHARED_SECRET) }),
        { redirect: "manual" },
      );
      return isEdgeChallenge(response) ? challengeUnavailable() : response;
    } catch {
      // Sem conexão com a API (o Render subindo, por exemplo). Um 502 diz ao front que o pedido
      // não chegou lá, e que pode tentar de novo sem risco.
      return Response.json(
        { title: "Bad Gateway", status: 502, detail: "O servidor não respondeu. Tente de novo em instantes." },
        { status: 502, headers: { "Content-Type": "application/problem+json" } },
      );
    }
  },

  /** O Cron Trigger do wrangler.jsonc: ver {@link keepApiAwake}. */
  scheduled(_controller: unknown, env: Env, ctx: ExecutionContext): void {
    ctx.waitUntil(keepApiAwake(env));
  },
};

/**
 * Um despertar do Render leva de 2 a 4 minutos; o ping espera por ele em vez de desistir antes.
 * Um cron pode durar até 15 minutos de relógio, e esperar não conta como CPU.
 */
export const KEEP_AWAKE_TIMEOUT_MS = 240_000;

export type KeepAwakeResult = "awake" | "redeployed" | "challenged" | "unreachable";

/**
 * Roda a cada 10 minutos (o `triggers.crons` do wrangler.jsonc) e faz duas coisas (decisão 38):
 *
 * - mantém a API acordada. Depois que a instância gratuita hiberna, a Cloudflare do Render passa a
 *   responder com o desafio anti-bot, até para um curl direto, e nenhum pedido chega para acordá-la.
 *   Com um pedido a cada 10 minutos ela nunca chega aos 15 de ociosidade que a fazem dormir. O
 *   /health não toca no banco, então o ping não gasta o compute do Neon;
 * - se mesmo assim encontrar o desafio, dispara um deploy pelo Deploy Hook, que fica em
 *   api.render.com, fora desse bloqueio. É o que destrava: um deploy sobe uma instância nova sem
 *   depender de um pedido passar pela Cloudflare.
 */
export async function keepApiAwake(env: Env): Promise<KeepAwakeResult> {
  let response: Response;
  try {
    response = await fetch(new URL("/api/health", env.API_ORIGIN).toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(KEEP_AWAKE_TIMEOUT_MS),
    });
  } catch {
    // Sem resposta nem desafio: o Render está subindo ou fora do ar. Um deploy aqui só atrapalharia
    // um despertar em andamento; o próximo cron tenta de novo.
    console.warn("keep-awake: a API não respondeu");
    return "unreachable";
  }

  if (!isEdgeChallenge(response)) {
    if (!response.ok) console.warn(`keep-awake: a API respondeu ${response.status}`);
    return "awake";
  }

  if (!env.RENDER_DEPLOY_HOOK_URL) {
    console.warn("keep-awake: desafio da Cloudflare do Render, e sem RENDER_DEPLOY_HOOK_URL para destravar");
    return "challenged";
  }
  const hook = await fetch(env.RENDER_DEPLOY_HOOK_URL, { method: "POST" });
  console.warn(`keep-awake: desafio da Cloudflare do Render; deploy disparado (${hook.status})`);
  return "redeployed";
}

/**
 * A Cloudflare que fica na frente do Render às vezes responde com um desafio anti-bot (um 429 ou 403
 * em HTML, com `cf-mitigated: challenge`) em vez de repassar o pedido — visto enquanto a API do plano
 * gratuito acorda. Ninguém aqui resolve esse desafio: nem este Worker nem o fetch do app.
 */
export function isEdgeChallenge(response: Response): boolean {
  if (response.headers.get("cf-mitigated") === "challenge") return true;
  // A borda do Render também devolve um 429 em texto puro ("Too Many Requests"). O 429 da API é
  // sempre um ProblemDetail em JSON (problem+json ou json, conforme o Accept), então um 429 que não
  // é JSON não veio dela.
  const contentType = response.headers.get("Content-Type") ?? "";
  return response.status === 429 && !/^application\/(problem\+)?json/.test(contentType);
}

/** Tempo sugerido ao front antes da próxima tentativa depois de um desafio. */
export const CHALLENGE_RETRY_AFTER_SECONDS = 5;

/**
 * O desafio vira um 503: o pedido não chegou à API, então é seguro repetir, e o front já trata 503
 * como "servidor ainda não está de pé". Repassado como 429, ele pareceria o limite de tentativas da
 * própria API, e o HTML do desafio não é um ProblemDetail.
 */
function challengeUnavailable(): Response {
  return Response.json(
    {
      title: "Service Unavailable",
      status: 503,
      detail: "O servidor ainda está acordando. Tente de novo em instantes.",
    },
    {
      status: 503,
      headers: {
        "Content-Type": "application/problem+json",
        "Retry-After": String(CHALLENGE_RETRY_AFTER_SECONDS),
      },
    },
  );
}
