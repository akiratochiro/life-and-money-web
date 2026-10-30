import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createServerWake, type ServerStatus } from "./serverWake";

const options = { slowAfterMs: 2_000, giveUpAfterMs: 90_000, retryDelayMs: 2_000 };

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
    await vi.advanceTimersByTimeAsync(2_000);
    health.answer(true);
    await ready;

    expect(health.check).toHaveBeenCalledTimes(3);
    expect(wake.getStatus()).toBe("ready");
  });

  it("desiste depois do tempo de um despertar e só recomeça quando o usuário pede", async () => {
    const check = vi.fn(async () => false);
    const wake = createServerWake({ ...options, check });
    let isReady = false;
    void wake.waitUntilReady().then(() => {
      isReady = true;
    });

    await vi.advanceTimersByTimeAsync(90_000);
    expect(wake.getStatus()).toBe("unreachable");
    const attempts = check.mock.calls.length;

    await vi.advanceTimersByTimeAsync(60_000);
    expect(check).toHaveBeenCalledTimes(attempts);
    expect(isReady).toBe(false);

    check.mockResolvedValue(true);
    wake.retry();
    await vi.advanceTimersByTimeAsync(0);

    expect(wake.getStatus()).toBe("ready");
    expect(isReady).toBe(true);
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
