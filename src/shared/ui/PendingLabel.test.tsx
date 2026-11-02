import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PendingLabel } from "./PendingLabel";

describe("PendingLabel", () => {
  it("fora do envio, o botão tem o próprio texto", () => {
    render(<button><PendingLabel pending={false} pendingText="Salvando…">Salvar</PendingLabel></button>);

    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  });

  it("durante o envio, o texto continua lá ocupando espaço, e o nome anuncia a espera", () => {
    render(<button><PendingLabel pending pendingText="Salvando…">Salvar</PendingLabel></button>);

    // O texto não sai do DOM (é o que mantém a largura), só fica invisível.
    expect(screen.getByText("Salvar")).toHaveClass("invisible");
    expect(screen.getByRole("button", { name: "Salvando…" })).toBeInTheDocument();
  });
});
