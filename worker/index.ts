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
  ASSETS: { fetch(request: Request): Promise<Response> };
};

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
      return await fetch(new Request(upstream, { headers: upstreamHeaders(request, env.PROXY_SHARED_SECRET) }), {
        redirect: "manual",
      });
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
