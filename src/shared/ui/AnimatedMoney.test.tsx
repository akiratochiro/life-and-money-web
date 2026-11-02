import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AnimatedMoney } from "./AnimatedMoney";
import { COUNT_UP_MS } from "./useCountUp";
import { PrivacyProvider } from "../privacy/PrivacyProvider";
import { usePrivacy } from "../privacy/privacyContext";
import { formatCents } from "../lib/money";

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce && query.includes("reduce"), media: query }));
}

function Toggle() {
  return <button onClick={usePrivacy().toggle}>ocultar</button>;
}

/** O que aparece na tela (o leitor de tela lê o outro span). */
const visible = (container: HTMLElement) => container.querySelector('[aria-hidden="true"]')?.textContent;

beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
  setReducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("AnimatedMoney", () => {
  it("conta de zero até o valor e para exatamente nele", () => {
    const { container } = render(<PrivacyProvider><AnimatedMoney value={1234.56} /></PrivacyProvider>);
    expect(visible(container)).toBe(formatCents(0));

    act(() => vi.advanceTimersByTime(COUNT_UP_MS / 2));
    const halfway = visible(container);
    expect(halfway).not.toBe(formatCents(0));
    expect(halfway).not.toBe(formatCents(123456));

    act(() => vi.advanceTimersByTime(COUNT_UP_MS));
    expect(visible(container)).toBe(formatCents(123456));
  });

  it("quando o valor muda, conta a partir do anterior", () => {
    const { container, rerender } = render(<PrivacyProvider><AnimatedMoney value={100} /></PrivacyProvider>);
    act(() => vi.advanceTimersByTime(COUNT_UP_MS * 2));

    rerender(<PrivacyProvider><AnimatedMoney value={50} /></PrivacyProvider>);
    act(() => vi.advanceTimersByTime(16));
    const value = Number(visible(container)?.replace(/\D/g, ""));
    expect(value).toBeGreaterThan(5000);
    expect(value).toBeLessThan(10000);

    act(() => vi.advanceTimersByTime(COUNT_UP_MS));
    expect(visible(container)).toBe(formatCents(5000));
  });

  it("o leitor de tela lê só o valor final, desde o primeiro quadro", () => {
    const { container } = render(<PrivacyProvider><AnimatedMoney value={1234.56} /></PrivacyProvider>);

    // O Intl separa "R$" do número com um espaço não separável, então a comparação é pelo texto exato.
    expect(container.querySelector(".sr-only")?.textContent).toBe(formatCents(123456));
    expect(visible(container)).toBe(formatCents(0));
  });

  it("com movimento reduzido, mostra o valor final direto", () => {
    setReducedMotion(true);
    const { container } = render(<PrivacyProvider><AnimatedMoney value={1234.56} /></PrivacyProvider>);

    expect(visible(container)).toBe(formatCents(123456));
  });

  it("com os valores ocultos, não anima nem revela", async () => {
    vi.useRealTimers();
    render(<PrivacyProvider><Toggle /><AnimatedMoney value={1234.56} /></PrivacyProvider>);

    await userEvent.click(screen.getByRole("button", { name: "ocultar" }));

    expect(screen.getByText("R$ ••••")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(formatCents(123456));
  });
});
