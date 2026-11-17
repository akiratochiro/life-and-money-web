// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { keepApiAwake, upstreamUrl } from "./index";

const API_ORIGIN = "https://life-and-money-api.onrender.com";

function env() {
  return {
    API_ORIGIN,
    PROXY_SHARED_SECRET: "segredo",
    ASSETS: { fetch: vi.fn(async () => new Response("<!doctype html>")) },
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
    );

    const [sent] = upstream.mock.calls[0];
    expect(sent.headers.has("X-Client-IP")).toBe(false);
    expect(sent.headers.has("X-Proxy-Auth")).toBe(false);
  });

  it("devolve a resposta da API como veio, incluindo o Set-Cookie", async () => {
    captureUpstream(
      new Response("{}", { status: 200, headers: { "Set-Cookie": "refreshToken=novo; Path=/api/auth; HttpOnly" } }),
    );

    const response = await worker.fetch(new Request("https://front.workers.dev/api/auth/login", { method: "POST" }), env());

    expect(response.headers.get("Set-Cookie")).toBe("refreshToken=novo; Path=/api/auth; HttpOnly");
  });

  it("responde 502 quando não consegue falar com a API, para o front saber que pode tentar de novo", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("connection refused");
    }));

    const response = await worker.fetch(new Request("https://front.workers.dev/api/health"), env());

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

    const response = await worker.fetch(new Request("https://front.workers.dev/api/health"), env());

    expect(response.status).toBe(503);
    expect(response.headers.get("Content-Type")).toBe("application/problem+json");
    expect(response.headers.get("Retry-After")).toBe("5");
    expect(await response.json()).toMatchObject({ status: 503 });
  });

  it("troca também o 429 em texto puro da borda do Render, que não é da API", async () => {
    captureUpstream(new Response("Too Many Requests", { status: 429, headers: { "Content-Type": "text/plain; charset=utf-8" } }));

    const response = await worker.fetch(new Request("https://front.workers.dev/api/health"), env());

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

    const response = await worker.fetch(new Request("https://front.workers.dev/api/auth/login", { method: "POST" }), env());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("30");
  });

  it("não manda para a API o que não é /api, nem um caminho que só começa parecido", async () => {
    const upstream = captureUpstream();
    const bindings = env();

    await worker.fetch(new Request("https://front.workers.dev/goals"), bindings);
    await worker.fetch(new Request("https://front.workers.dev/apivo"), bindings);

    expect(upstream).not.toHaveBeenCalled();
    expect(bindings.ASSETS.fetch).toHaveBeenCalledTimes(2);
  });
});

type FetchMock = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

describe("keepApiAwake", () => {
  const HOOK = "https://api.render.com/deploy/srv-x?key=y";
  const challenge = () =>
    new Response("<!DOCTYPE html><title>Just a moment...</title>", {
      status: 429,
      headers: { "cf-mitigated": "challenge", "Content-Type": "text/html; charset=UTF-8" },
    });

  it("bate no /health direto no Render e não mexe em nada quando a API responde", async () => {
    const upstream = vi.fn<FetchMock>(async () => new Response('{"status":"UP"}'));
    vi.stubGlobal("fetch", upstream);

    expect(await keepApiAwake({ ...env(), RENDER_DEPLOY_HOOK_URL: HOOK })).toBe("awake");
    expect(upstream).toHaveBeenCalledOnce();
    expect(String(upstream.mock.calls[0][0])).toBe("https://life-and-money-api.onrender.com/api/health");
  });

  it("dispara o deploy quando encontra o desafio da Cloudflare do Render", async () => {
    const upstream = vi.fn<FetchMock>(async (input) =>
      String(input) === HOOK ? new Response("{}", { status: 200 }) : challenge(),
    );
    vi.stubGlobal("fetch", upstream);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(await keepApiAwake({ ...env(), RENDER_DEPLOY_HOOK_URL: HOOK })).toBe("redeployed");
    const [hookUrl, init] = upstream.mock.calls[1];
    expect(String(hookUrl)).toBe(HOOK);
    expect(init?.method).toBe("POST");
  });

  it("sem o Deploy Hook configurado, só registra o desafio", async () => {
    const upstream = vi.fn(async () => challenge());
    vi.stubGlobal("fetch", upstream);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(await keepApiAwake(env())).toBe("challenged");
    expect(upstream).toHaveBeenCalledOnce();
  });

  it("não dispara deploy quando a API só não respondeu: pode ser um despertar em andamento", async () => {
    const upstream = vi.fn(async () => {
      throw new DOMException("timeout", "TimeoutError");
    });
    vi.stubGlobal("fetch", upstream);
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(await keepApiAwake({ ...env(), RENDER_DEPLOY_HOOK_URL: HOOK })).toBe("unreachable");
    expect(upstream).toHaveBeenCalledOnce();
  });

  it("o cron segura o evento até o ping terminar", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response('{"status":"UP"}')));
    const waitUntil = vi.fn();

    worker.scheduled({}, env(), { waitUntil });

    expect(waitUntil).toHaveBeenCalledOnce();
    await expect(waitUntil.mock.calls[0][0]).resolves.toBe("awake");
  });
});
