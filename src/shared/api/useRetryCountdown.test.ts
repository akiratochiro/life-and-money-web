import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./problem";
import { formatWait, useRetryCountdown } from "./useRetryCountdown";

const tooManyRequests = (seconds: number) =>
  new ApiError(429, { detail: "Muitas tentativas…", retryAfterSeconds: seconds });

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("formatWait", () => {
  it("mostra segundos abaixo de um minuto e minutos:segundos a partir dele", () => {
    expect(formatWait(45)).toBe("45 s");
    expect(formatWait(60)).toBe("1:00");
    expect(formatWait(65)).toBe("1:05");
    expect(formatWait(720)).toBe("12:00");
  });
});

describe("useRetryCountdown", () => {
  it("conta a espera de um 429 até zerar", () => {
    // O mesmo objeto de erro entre renders, como o mutation.error do TanStack Query.
    const error = tooManyRequests(3);
    const { result } = renderHook(() => useRetryCountdown(error));
    expect(result.current).toBe(3);

    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current).toBe(2);

    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current).toBe(0);
  });

  it("é zero para qualquer outro erro", () => {
    const error = new ApiError(401, { detail: "x" });
    const { result } = renderHook(() => useRetryCountdown(error));

    expect(result.current).toBe(0);
  });

  it("recomeça quando chega um 429 novo", () => {
    const { result, rerender } = renderHook(({ error }) => useRetryCountdown(error), {
      initialProps: { error: tooManyRequests(3) as unknown },
    });
    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current).toBe(1);

    rerender({ error: tooManyRequests(10) });

    expect(result.current).toBe(10);
  });
});
