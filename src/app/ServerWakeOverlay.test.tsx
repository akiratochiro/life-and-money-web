import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ServerWakeOverlay } from "./ServerWakeOverlay";

describe("ServerWakeOverlay", () => {
  it("avisa que o servidor está acordando, sem parecer erro", () => {
    render(<ServerWakeOverlay status="waking" onRetry={() => {}} />);

    expect(screen.getByRole("status")).toHaveTextContent("Acordando o servidor…");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("só anima o indicador para quem não pediu menos movimento", () => {
    render(<ServerWakeOverlay status="waking" onRetry={() => {}} />);

    const mark = screen.getByTestId("wake-mark");
    // A animação está atrás do motion-safe, que o Tailwind compila para
    // @media (prefers-reduced-motion: no-preference).
    expect(mark.getAttribute("class")).toMatch(/^motion-safe:animate-/);
  });

  it("oferece tentar de novo quando o servidor não acorda", async () => {
    const onRetry = vi.fn();
    render(<ServerWakeOverlay status="unreachable" onRetry={onRetry} />);

    expect(screen.getByRole("status")).toHaveTextContent("O servidor não respondeu");
    expect(screen.getByTestId("wake-mark")).not.toHaveAttribute("class");

    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});
