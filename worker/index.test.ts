// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { upstreamUrl } from "./index";

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

  it("não manda para a API o que não é /api, nem um caminho que só começa parecido", async () => {
    const upstream = captureUpstream();
    const bindings = env();

    await worker.fetch(new Request("https://front.workers.dev/goals"), bindings);
    await worker.fetch(new Request("https://front.workers.dev/apivo"), bindings);

    expect(upstream).not.toHaveBeenCalled();
    expect(bindings.ASSETS.fetch).toHaveBeenCalledTimes(2);
  });
});
