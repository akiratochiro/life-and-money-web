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
  ASSETS: { fetch(request: Request): Promise<Response> };
};

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

    // Método, headers (Cookie, Authorization, X-Refresh-Request) e corpo seguem iguais. Um
    // redirecionamento da API volta para o navegador em vez de ser seguido aqui.
    return fetch(new Request(upstreamUrl(request.url, env.API_ORIGIN), request), { redirect: "manual" });
  },
};
