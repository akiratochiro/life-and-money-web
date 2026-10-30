import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./problem";
import { MAX_QUERY_RETRIES, READ_TIMEOUT_MS, isTransient, retryDelay, shouldRetryQuery, withReadTimeout } from "./retryPolicy";

describe("isTransient", () => {
  it("espera a API quando o proxy diz que ela ainda não está de pé", () => {
    expect(isTransient(new ApiError(502, undefined))).toBe(true);
    expect(isTransient(new ApiError(503, undefined))).toBe(true);
    expect(isTransient(new ApiError(504, undefined))).toBe(true);
  });

  it("espera quando a rede falha ou a leitura passa do tempo", () => {
    expect(isTransient(new TypeError("Failed to fetch"))).toBe(true);
    expect(isTransient(new DOMException("timeout", "TimeoutError"))).toBe(true);
  });

  it("não repete o que é resposta da própria API", () => {
    expect(isTransient(new ApiError(400, undefined))).toBe(false);
    expect(isTransient(new ApiError(401, undefined))).toBe(false);
    expect(isTransient(new ApiError(404, undefined))).toBe(false);
    expect(isTransient(new ApiError(500, undefined))).toBe(false);
  });

  it("não repete um cancelamento que não foi timeout", () => {
    expect(isTransient(new DOMException("aborted", "AbortError"))).toBe(false);
  });
});

describe("shouldRetryQuery", () => {
  it("tenta de novo um erro transitório até o limite", () => {
    const gateway = new ApiError(502, undefined);

    expect(shouldRetryQuery(0, gateway)).toBe(true);
    expect(shouldRetryQuery(MAX_QUERY_RETRIES - 1, gateway)).toBe(true);
    expect(shouldRetryQuery(MAX_QUERY_RETRIES, gateway)).toBe(false);
  });

  it("dá tempo para um despertar de um minuto", () => {
    let waited = 0;
    for (let failure = 0; failure < MAX_QUERY_RETRIES; failure++) {
      waited += retryDelay(failure);
    }

    // Só as pausas; cada tentativa ainda pode esperar até o timeout de leitura.
    expect(waited).toBeGreaterThanOrEqual(30_000);
  });
});

describe("retryDelay", () => {
  it("dobra a espera a cada falha, com teto de 10 s", () => {
    expect([0, 1, 2, 3, 4, 5].map(retryDelay)).toEqual([1_000, 2_000, 4_000, 8_000, 10_000, 10_000]);
  });
});

describe("withReadTimeout", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("põe prazo nas leituras", () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");

    const read = withReadTimeout(new Request("http://localhost/api/transactions"));

    expect(timeout).toHaveBeenCalledWith(READ_TIMEOUT_MS);
    expect(read.method).toBe("GET");
    expect(read.url).toBe("http://localhost/api/transactions");
  });

  it("deixa as escritas sem prazo, para nunca abortar um lançamento no meio", () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const write = new Request("http://localhost/api/transactions", { method: "POST", body: "{}" });

    expect(withReadTimeout(write)).toBe(write);
    expect(timeout).not.toHaveBeenCalled();
  });
});
