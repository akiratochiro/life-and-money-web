import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServerWake, type ServerStatus } from "./serverWake";

const options = { slowAfterMs: 2_000, giveUpAfterMs: 90_000, retryDelayMs: 2_000, maxRetryDelayMs: 15_000 };

/** Um /health que responde só quando o teste mandar. */
function controllableHealth() {
  const answers: Array<(ok: boolean) => void> = [];
  const check = vi.fn(() => new Promise<boolean>((resolve) => answers.push(resolve)));
  return { check, answer: (ok: boolean) => answers.shift()!(ok) };
}

function trackStatus(wake: ReturnType<typeof createServerWake>) {
  const seen: ServerStatus[] = [];
  wake.subscribe(() => seen.push(wake.getStatus()));
  return seen;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createServerWake", () => {
  it("não mostra aviso quando o servidor responde rápido", async () => {
    const health = controllableHealth();
    const wake = createServerWake({ ...options, check: health.check });
    const seen = trackStatus(wake);

    const ready = wake.waitUntilReady();
    await vi.advanceTimersByTimeAsync(500);
    health.answer(true);
    await ready;
    await vi.advanceTimersByTimeAsync(5_000);

    expect(seen).toEqual(["ready"]);
  });

  it("passa a avisar que está acordando depois de 2 s sem resposta", async () => {
    const health = controllableHealth();
    const wake = createServerWake({ ...options, check: health.check });

    void wake.waitUntilReady();
    await vi.advanceTimersByTimeAsync(1_999);
    expect(wake.getStatus()).toBe("checking");

    await vi.advanceTimersByTimeAsync(1);
    expect(wake.getStatus()).toBe("waking");
  });

  it("tenta de novo enquanto o servidor falha, até ele responder", async () => {
    const health = controllableHealth();
    const wake = createServerWake({ ...options, check: health.check });
    const ready = wake.waitUntilReady();

    health.answer(false); // 502 do proxy enquanto o Render sobe
    await vi.advanceTimersByTimeAsync(2_000);
    health.answer(false);
    await vi.advanceTimersByTimeAsync(4_000); // o intervalo dobra
    health.answer(true);
    await ready;

    expect(health.check).toHaveBeenCalledTimes(3);
    expect(wake.getStatus()).toBe("ready");
  });

  it("troca o aviso depois do tempo de um despertar, mas segue tentando sozinho", async () => {
    const check = vi.fn(async () => false);
    const wake = createServerWake({ ...options, check });
    let isReady = false;
    void wake.waitUntilReady().then(() => {
      isReady = true;
    });

    // A primeira falha depois dos 90 s é a tentativa dos 104 s.
    await vi.advanceTimersByTimeAsync(105_000);
    expect(wake.getStatus()).toBe("unreachable");

    check.mockResolvedValue(true);
    await vi.advanceTimersByTimeAsync(15_000);

    expect(wake.getStatus()).toBe("ready");
    expect(isReady).toBe(true);
  });

  it("espaça as tentativas, dobrando o intervalo até o teto", async () => {
    const check = vi.fn(async () => false);
    const wake = createServerWake({ ...options, check });
    void wake.waitUntilReady();

    // Tentativas em 0, 2, 6, 14, 29, 44 e 59 s: 2, 4, 8 e depois 15 s de intervalo.
    await vi.advanceTimersByTimeAsync(60_000);

    expect(check).toHaveBeenCalledTimes(7);
  });

  it("o botão tenta na hora, sem esperar o intervalo, e volta a mostrar que está acordando", async () => {
    const check = vi.fn(async () => false);
    const wake = createServerWake({ ...options, check });
    let isReady = false;
    void wake.waitUntilReady().then(() => {
      isReady = true;
    });
    // A primeira falha depois dos 90 s é a tentativa dos 104 s.
    await vi.advanceTimersByTimeAsync(105_000);
    expect(wake.getStatus()).toBe("unreachable");

    check.mockResolvedValue(true);
    wake.retry();
    expect(wake.getStatus()).toBe("waking");
    await vi.advanceTimersByTimeAsync(0);

    expect(wake.getStatus()).toBe("ready");
    expect(isReady).toBe(true);
  });

  it("o botão não dispara uma segunda tentativa enquanto uma está em andamento", async () => {
    const health = controllableHealth();
    const wake = createServerWake({ ...options, giveUpAfterMs: 0, check: health.check });
    void wake.waitUntilReady();

    health.answer(false);
    await vi.advanceTimersByTimeAsync(2_000); // segunda tentativa sai e fica pendurada
    expect(wake.getStatus()).toBe("unreachable");

    wake.retry();
    await vi.advanceTimersByTimeAsync(0);

    expect(health.check).toHaveBeenCalledTimes(2);
  });

  it("compartilha as tentativas entre quem espera ao mesmo tempo", async () => {
    const health = controllableHealth();
    const wake = createServerWake({ ...options, check: health.check });

    const first = wake.waitUntilReady();
    const second = wake.waitUntilReady();
    health.answer(true);
    await Promise.all([first, second]);

    expect(health.check).toHaveBeenCalledTimes(1);
  });
});
