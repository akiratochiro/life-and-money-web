import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { AmountInput } from "./AmountInput";

// O AmountInput é controlado: quem guarda os centavos é o formulário. Este wrapper faz o papel dele.
function Form({ initial = 0 }: { initial?: number }) {
  const [cents, setCents] = useState(initial);
  return (
    <>
      <AmountInput label="Valor" cents={cents} onChange={setCents} />
      <output>{cents}</output>
    </>
  );
}

describe("AmountInput", () => {
  it("trata o que é digitado como centavos", async () => {
    render(<Form />);
    const input = screen.getByLabelText("Valor");

    await userEvent.type(input, "25075");

    expect(input).toHaveValue("R$ 250,75");
    expect(screen.getByRole("status")).toHaveTextContent("25075");
  });

  it("apaga o último dígito com backspace", async () => {
    render(<Form initial={25075} />);
    const input = screen.getByLabelText("Valor");

    await userEvent.type(input, "{Backspace}");

    expect(input).toHaveValue("R$ 25,07");
  });

  it("ignora letras e sinais", async () => {
    render(<Form />);
    const input = screen.getByLabelText("Valor");

    await userEvent.type(input, "1a,2-3");

    expect(screen.getByRole("status")).toHaveTextContent("123");
  });
});
