import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TextField } from "./TextField";

describe("TextField", () => {
  it("a dica orienta sem marcar o campo como inválido", () => {
    render(<TextField label="Senha" hint="Mínimo de 8 caracteres." />);

    const input = screen.getByLabelText("Senha");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).toHaveAccessibleDescription("Mínimo de 8 caracteres.");
  });

  it("o erro toma o lugar da dica e marca o campo", () => {
    render(<TextField label="Senha" hint="Mínimo de 8 caracteres." error="Escolha outra senha." />);

    const input = screen.getByLabelText("Senha");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Escolha outra senha.");
    expect(screen.queryByText("Mínimo de 8 caracteres.")).not.toBeInTheDocument();
  });
});
