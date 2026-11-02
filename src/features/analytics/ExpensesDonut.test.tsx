import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ExpensesDonut } from "./ExpensesDonut";
import { PrivacyProvider } from "../../shared/privacy/PrivacyProvider";

const data = {
  month: "2026-10",
  total: 1000,
  categories: [
    { categoryId: 1, name: "Moradia", total: 600, percentage: 60 },
    { categoryId: 2, name: "Mercado", total: 400, percentage: 40 },
  ],
};

describe("ExpensesDonut", () => {
  it("cada fatia e cada item da legenda usam a cor da própria categoria", () => {
    const colors: Record<number, string> = { 1: "var(--color-cat-peach)", 2: "var(--color-cat-lime)" };
    const { container } = render(
      <PrivacyProvider>
        <ExpensesDonut data={data} colorOf={(id) => colors[id]} />
      </PrivacyProvider>,
    );

    const strokes = [...container.querySelectorAll("circle")].map((circle) => circle.getAttribute("stroke"));
    expect(strokes).toContain("var(--color-cat-peach)");
    expect(strokes).toContain("var(--color-cat-lime)");
    expect(screen.getByRole("img", { name: /Moradia, 60%/ })).toBeInTheDocument();
  });

  it("uma categoria sem cor conhecida não quebra o gráfico", () => {
    const { container } = render(
      <PrivacyProvider>
        <ExpensesDonut data={data} colorOf={() => undefined} />
      </PrivacyProvider>,
    );

    expect(container.querySelectorAll("circle").length).toBeGreaterThan(2);
  });
});
