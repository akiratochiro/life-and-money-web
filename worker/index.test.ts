// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { REDEPLOY_COOLDOWN_MS, redeployOnChallenge, upstreamUrl } from "./index";

const API_ORIGIN = "https://life-and-money-api.onrender.com";

function env() {
  return {
    API_ORIGIN,
    PROXY_SHARED_SECRET: "segredo",
    ASSETS: { fetch: vi.fn(async () => new Response("<!doctype html>")) },
  };
}

/** Um contexto do Workers que guarda o que o Worker deixou para depois de responder. */
function ctx() {
  return { waitUntil: vi.fn<(promise: Promise<unknown>) => void>() };
}

/** Um KV em memória, do tamanho do que o Worker usa. */
function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    get: vi.fn(async (key: string) => data.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      data.set(key, value);
    }),
  };
}

/** Substitui o fetch global e devolve a requisição que o Worker mandou para a API. */
function captureUpstream(response = new Response("{}", { status: 200 })) {
  const upstream = vi.fn<(input: Request, init?: RequestInit) => Promise<Response>>(async () => response);
  vi.stubGlobal("fetch", upstream);
  return upstream;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("upstreamUrl", () => {
  it("troca só a origem, mantendo o caminho com /api e a query", () => {
    expect(upstreamUrl("https://front.workers.dev/api/transactions?month=2026-10", API_ORIGIN)).toBe(
      "https://life-and-money-api.onrender.com/api/transactions?month=2026-10",
    );
  });
});

describe("worker", () => {
  it("repassa /api/* para a API com método, headers e corpo", async () => {
    const upstream = captureUpstream();

    await worker.fetch(
      new Request("https://front.workers.dev/api/auth/refresh", {
        method: "POST",
        headers: { Cookie: "refreshToken=abc", "X-Refresh-Request": "1", "Content-Type": "application/json" },
        body: '{"x":1}',
      }),
      env(),
      ctx(),
    );

    const [sent, init] = upstream.mock.calls[0];
    expect(sent.url).toBe("https://life-and-money-api.onrender.com/api/auth/refresh");
    expect(sent.method).toBe("POST");
    expect(sent.headers.get("Cookie")).toBe("refreshToken=abc");
    expect(sent.headers.get("X-Refresh-Request")).toBe("1");
    expect(await sent.text()).toBe('{"x":1}');
    expect(init?.redirect).toBe("manual");
  });

  it("repassa o IP real do usuário com o segredo, no lugar do que a Cloudflare escreveria", async () => {
    const upstream = captureUpstream();

    await worker.fetch(
      new Request("https://front.workers.dev/api/auth/login", {
        method: "POST",
        headers: { "CF-Connecting-IP": "198.51.100.7" },
      }),
      env(),
      ctx(),
    );

    const [sent] = upstream.mock.calls[0];
    expect(sent.headers.get("X-Client-IP")).toBe("198.51.100.7");
    expect(sent.headers.get("X-Proxy-Auth")).toBe("segredo");
  });

  it("descarta um X-Client-IP ou X-Proxy-Auth mandado pelo navegador", async () => {
    const upstream = captureUpstream();

    await worker.fetch(
      new Request("https://front.workers.dev/api/auth/login", {
        method: "POST",
        headers: { "CF-Connecting-IP": "198.51.100.7", "X-Client-IP": "10.9.9.9", "X-Proxy-Auth": "chute" },
      }),
      env(),
      ctx(),
    );

    const [sent] = upstream.mock.calls[0];
    expect(sent.headers.get("X-Client-IP")).toBe("198.51.100.7");
    expect(sent.headers.get("X-Proxy-Auth")).toBe("segredo");
  });

  it("sem o secret configurado, não manda IP nem segredo nenhum", async () => {
    const upstream = captureUpstream();

    await worker.fetch(
      new Request("https://front.workers.dev/api/auth/login", {
        method: "POST",
        headers: { "CF-Connecting-IP": "198.51.100.7", "X-Proxy-Auth": "chute" },
      }),
      { ...env(), PROXY_SHARED_SECRET: undefined },
      ctx(),
    );

    const [sent] = upstream.mock.calls[0];
    expect(sent.headers.has("X-Client-IP")).toBe(false);
    expect(sent.headers.has("X-Proxy-Auth")).toBe(false);
  });

  it("devolve a resposta da API como veio, incluindo o Set-Cookie", async () => {
    captureUpstream(
      new Response("{}", { status: 200, headers: { "Set-Cookie": "refreshToken=novo; Path=/api/auth; HttpOnly" } }),
    );

    const response = await worker.fetch(new Request("https://front.workers.dev/api/auth/login", { method: "POST" }), env(), ctx());

    expect(response.headers.get("Set-Cookie")).toBe("refreshToken=novo; Path=/api/auth; HttpOnly");
  });

  it("responde 502 quando não consegue falar com a API, para o front saber que pode tentar de novo", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("connection refused");
    }));

    const response = await worker.fetch(new Request("https://front.workers.dev/api/health"), env(), ctx());

    expect(response.status).toBe(502);
    expect(response.headers.get("Content-Type")).toBe("application/problem+json");
    expect(await response.json()).toMatchObject({ status: 502 });
  });

  it("troca o desafio anti-bot da Cloudflare do Render por um 503 que o front sabe repetir", async () => {
    captureUpstream(
      new Response("<!DOCTYPE html><title>Just a moment...</title>", {
        status: 429,
        headers: { "cf-mitigated": "challenge", "Content-Type": "text/html; charset=UTF-8" },
      }),
    );

    const response = await worker.fetch(new Request("https://front.workers.dev/api/health"), env(), ctx());

    expect(response.status).toBe(503);
    expect(response.headers.get("Content-Type")).toBe("application/problem+json");
    expect(response.headers.get("Retry-After")).toBe("5");
    expect(await response.json()).toMatchObject({ status: 503 });
  });

  it("troca também o 429 em texto puro da borda do Render, que não é da API", async () => {
    captureUpstream(new Response("Too Many Requests", { status: 429, headers: { "Content-Type": "text/plain; charset=utf-8" } }));

    const response = await worker.fetch(new Request("https://front.workers.dev/api/health"), env(), ctx());

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("5");
  });

  it("repassa como veio um 429 da própria API, que não é desafio", async () => {
    captureUpstream(
      new Response('{"status":429}', {
        status: 429,
        headers: { "Retry-After": "30", "Content-Type": "application/problem+json" },
      }),
    );

    const response = await worker.fetch(new Request("https://front.workers.dev/api/auth/login", { method: "POST" }), env(), ctx());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
  });

  it("não manda para a API o que não é /api, nem um caminho que só começa parecido", async () => {
    const upstream = captureUpstream();
    const bindings = env();

    await worker.fetch(new Request("https://front.workers.dev/goals"), bindings, ctx());
    await worker.fetch(new Request("https://front.workers.dev/apivo"), bindings, ctx());

    expect(upstream).not.toHaveBeenCalled();
    expect(bindings.ASSETS.fetch).toHaveBeenCalledTimes(2);
  });
});

type FetchMock = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

describe("redeployOnChallenge", () => {
  const HOOK = "https://api.render.com/deploy/srv-x?key=y";
  const NOW = 1_800_000_000_000;

  function hookFetch() {
    const hook = vi.fn<FetchMock>(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", hook);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    return hook;
  }

  it("dispara o Deploy Hook e marca a hora no KV", async () => {
    const hook = hookFetch();
    const store = memoryStore();

    expect(await redeployOnChallenge({ ...env(), RENDER_DEPLOY_HOOK_URL: HOOK, WAKE_STATE: store }, NOW)).toBe("redeployed");

    const [url, init] = hook.mock.calls[0];
    expect(String(url)).toBe(HOOK);
    expect(init?.method).toBe("POST");
    expect(store.data.get("lastRedeployAt")).toBe(String(NOW));
  });

  it("não empilha deploys dentro do intervalo", async () => {
    const hook = hookFetch();
    const store = memoryStore({ lastRedeployAt: String(NOW - REDEPLOY_COOLDOWN_MS + 1) });

    expect(await redeployOnChallenge({ ...env(), RENDER_DEPLOY_HOOK_URL: HOOK, WAKE_STATE: store }, NOW)).toBe("cooling-down");
    expect(hook).not.toHaveBeenCalled();
  });

  it("dispara de novo passado o intervalo, se o desafio continuar", async () => {
    const hook = hookFetch();
    const store = memoryStore({ lastRedeployAt: String(NOW - REDEPLOY_COOLDOWN_MS) });

    expect(await redeployOnChallenge({ ...env(), RENDER_DEPLOY_HOOK_URL: HOOK, WAKE_STATE: store }, NOW)).toBe("redeployed");
    expect(hook).toHaveBeenCalledOnce();
  });

  it("sem o hook ou o KV configurados, não faz nada", async () => {
    const hook = hookFetch();

    expect(await redeployOnChallenge({ ...env(), WAKE_STATE: memoryStore() }, NOW)).toBe("unconfigured");
    expect(await redeployOnChallenge({ ...env(), RENDER_DEPLOY_HOOK_URL: HOOK }, NOW)).toBe("unconfigured");
    expect(hook).not.toHaveBeenCalled();
  });

  it("o proxy deixa o deploy para depois de responder, e só para o desafio anti-bot", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const bindings = { ...env(), RENDER_DEPLOY_HOOK_URL: HOOK, WAKE_STATE: memoryStore() };

    captureUpstream(new Response("<!DOCTYPE html>", { status: 429, headers: { "cf-mitigated": "challenge" } }));
    const onChallenge = ctx();
    expect((await worker.fetch(new Request("https://front.workers.dev/api/health"), bindings, onChallenge)).status).toBe(503);
    expect(onChallenge.waitUntil).toHaveBeenCalledOnce();

    // O 429 em texto puro da borda é limite de taxa, não o bloqueio: um deploy não muda nada.
    captureUpstream(new Response("Too Many Requests", { status: 429, headers: { "Content-Type": "text/plain" } }));
    const onRateLimit = ctx();
    expect((await worker.fetch(new Request("https://front.workers.dev/api/health"), bindings, onRateLimit)).status).toBe(503);
    expect(onRateLimit.waitUntil).not.toHaveBeenCalled();
  });
});
