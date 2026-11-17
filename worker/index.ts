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
   * quem tem a URL dispara deploys. Sem ele, o Worker só troca o desafio por 503.
   */
  RENDER_DEPLOY_HOOK_URL?: string;
  /** Quando foi o último deploy de destravamento (ver {@link redeployOnChallenge}). */
  WAKE_STATE?: KeyValueStore;
  ASSETS: { fetch(request: Request): Promise<Response> };
};

/** O pedaço do Workers KV que o Worker usa. */
type KeyValueStore = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

/** O pedaço do contexto do Workers que o proxy usa: terminar um trabalho depois de responder. */
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
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
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
      if (!isEdgeChallenge(response)) return response;
      if (response.headers.get("cf-mitigated") === "challenge") {
        // A resposta 503 sai já; o deploy é disparado depois, sem segurar o usuário.
        ctx.waitUntil(redeployOnChallenge(env));
      }
      return challengeUnavailable();
    } catch {
      // Sem conexão com a API (o Render subindo, por exemplo). Um 502 diz ao front que o pedido
      // não chegou lá, e que pode tentar de novo sem risco.
      return Response.json(
        { title: "Bad Gateway", status: 502, detail: "O servidor não respondeu. Tente de novo em instantes." },
        { status: 502, headers: { "Content-Type": "application/problem+json" } },
      );
    }
  },
};

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

/**
 * Intervalo mínimo entre dois deploys de destravamento. Um deploy leva uns 4 minutos de build e mais
 * 2 a 4 para a instância subir; antes disso, o desafio continuar é esperado, e outro deploy só
 * recomeçaria o build.
 */
export const REDEPLOY_COOLDOWN_MS = 15 * 60_000;

const LAST_REDEPLOY_KEY = "lastRedeployAt";

export type RedeployResult = "redeployed" | "cooling-down" | "unconfigured";

/**
 * Depois que a instância gratuita hiberna, a Cloudflare do Render às vezes liga o desafio anti-bot
 * para o endereço inteiro, até para um curl direto, e nenhum pedido chega para acordá-la. Um deploy
 * destrava, porque sobe uma instância nova sem depender de um pedido passar por lá; o Deploy Hook
 * fica em api.render.com, fora do bloqueio (decisão 38).
 *
 * Só acontece quando alguém usa o app e encontra o desafio, então a API continua dormindo quando
 * ninguém usa e não gasta horas do plano gratuito. O KV evita empilhar deploys: o primeiro desafio
 * dispara, e os seguintes esperam o intervalo. Duas abas no mesmo segundo podem disparar dois (o KV
 * não é atômico), o que só reinicia o build.
 */
export async function redeployOnChallenge(env: Env, now = Date.now()): Promise<RedeployResult> {
  if (!env.RENDER_DEPLOY_HOOK_URL || !env.WAKE_STATE) {
    console.warn("redeploy: desafio da Cloudflare do Render, sem RENDER_DEPLOY_HOOK_URL ou WAKE_STATE");
    return "unconfigured";
  }

  const last = Number(await env.WAKE_STATE.get(LAST_REDEPLOY_KEY));
  if (last && now - last < REDEPLOY_COOLDOWN_MS) return "cooling-down";

  // Marca antes de disparar: um segundo pedido que chegue enquanto o hook responde já encontra a marca.
  await env.WAKE_STATE.put(LAST_REDEPLOY_KEY, String(now), { expirationTtl: 24 * 60 * 60 });
  const hook = await fetch(env.RENDER_DEPLOY_HOOK_URL, { method: "POST" });
  console.warn(`redeploy: desafio da Cloudflare do Render; deploy disparado (${hook.status})`);
  return "redeployed";
}
