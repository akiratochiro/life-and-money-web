import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FloatingShapes } from "./FloatingShapes";
import { EmptyState } from "../ui/EmptyState";

describe("FloatingShapes", () => {
  it.each(["login", "empty"] as const)("no %s, é invisível para leitor de tela e para o mouse", (variant) => {
    const { container } = render(<FloatingShapes variant={variant} />);
    const layer = container.firstElementChild as HTMLElement;

    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer).toHaveClass("pointer-events-none");
  });

  it.each(["login", "empty"] as const)("no %s, só anima para quem não pediu menos movimento", (variant) => {
    const { container } = render(<FloatingShapes variant={variant} />);
    const shapes = [...container.firstElementChild!.children];

    expect(shapes.length).toBeGreaterThan(0);
    for (const shape of shapes) {
      // motion-safe: sem a preferência de movimento reduzido; com ela, a forma fica parada.
      expect(shape.getAttribute("class")).toContain("motion-safe:animate-float");
      expect(shape.getAttribute("class")).not.toMatch(/(^|\s)animate-float/);
    }
  });

  it("os estados vazios ganham moeda e porco, atrás do texto", () => {
    const { container, getByText } = render(<EmptyState>Nenhuma transação em outubro.</EmptyState>);

    expect(container.querySelector('[data-shape="coin"]')).not.toBeNull();
    expect(container.querySelector('[data-shape="pig"]')).not.toBeNull();
    // O texto fica numa camada acima das formas.
    expect(getByText("Nenhuma transação em outubro.")).toHaveClass("relative");
  });
});
