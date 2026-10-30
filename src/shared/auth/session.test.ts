import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { endSession, isSignedIn, renewSession } from "./session";

const token = { accessToken: "novo", expiresIn: 900, tokenType: "Bearer" };

function respond(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  vi.useFakeTimers();
  endSession();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("renewSession", () => {
  it("espera a API acordar quando o proxy responde 502 ou 503", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respond(502))
      .mockResolvedValueOnce(respond(503))
      .mockResolvedValueOnce(respond(200, token));
    vi.stubGlobal("fetch", fetchMock);

    const renewal = renewSession();
    await vi.runAllTimersAsync();

    await expect(renewal).resolves.toBe("novo");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(isSignedIn()).toBe(true);
  });

  it("espera o Retry-After de um 429 e tenta de novo, em vez de encerrar a sessão", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 429, headers: { "Retry-After": "7" } }))
      .mockResolvedValueOnce(respond(200, token));
    vi.stubGlobal("fetch", fetchMock);

    const renewal = renewSession();
    await vi.advanceTimersByTimeAsync(6_999);
    expect(fetchMock).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(1);
    await expect(renewal).resolves.toBe("novo");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("não repete uma recusa da API: a sessão acabou de verdade", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(401));
    vi.stubGlobal("fetch", fetchMock);

    const renewal = renewSession();
    await vi.runAllTimersAsync();

    await expect(renewal).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("não repete um erro que pode ter acontecido depois de a API rotacionar o token", async () => {
    // Com 500 ou 504, a API pode já ter trocado o token; reenviar o antigo revogaria todas as
    // sessões do usuário.
    for (const status of [500, 504]) {
      const fetchMock = vi.fn().mockResolvedValue(respond(status));
      vi.stubGlobal("fetch", fetchMock);

      const renewal = renewSession();
      await vi.runAllTimersAsync();

      await expect(renewal).resolves.toBeNull();
      expect(fetchMock).toHaveBeenCalledOnce();
    }
  });

  it("desiste depois do limite de tentativas", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond(502));
    vi.stubGlobal("fetch", fetchMock);

    const renewal = renewSession();
    await vi.runAllTimersAsync();

    await expect(renewal).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(7);
    expect(isSignedIn()).toBe(false);
  });
});
