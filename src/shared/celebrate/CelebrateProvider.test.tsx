import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONFETTI_MS, CONFETTI_PIECES, CelebrateProvider } from "./CelebrateProvider";
import { useCelebrate } from "./celebrateContext";

function Trigger() {
  return <button onClick={useCelebrate()}>comemorar</button>;
}

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce && query.includes("reduce"), media: query }));
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("CelebrateProvider", () => {
  it("solta uma rajada leve de confete, que some sozinha", () => {
    vi.useFakeTimers();
    setReducedMotion(false);
    render(<CelebrateProvider><Trigger /></CelebrateProvider>);

    act(() => screen.getByRole("button", { name: "comemorar" }).click());

    const layer = document.querySelector("[data-confetti]");
    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer?.children).toHaveLength(CONFETTI_PIECES);

    act(() => vi.advanceTimersByTime(CONFETTI_MS));
    expect(document.querySelector("[data-confetti]")).toBeNull();
  });

  it("com movimento reduzido, não há confete", () => {
    setReducedMotion(true);
    render(<CelebrateProvider><Trigger /></CelebrateProvider>);

    act(() => screen.getByRole("button", { name: "comemorar" }).click());

    expect(document.querySelector("[data-confetti]")).toBeNull();
  });
});
