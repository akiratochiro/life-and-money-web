import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TOAST_DURATION_MS, ToastProvider } from "./ToastProvider";
import { useToast } from "./toastContext";

function Trigger({ message, tone }: { message: string; tone?: "error" | "info" }) {
  const toast = useToast();
  return <button onClick={() => toast.show(message, tone)}>mostrar</button>;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("ToastProvider", () => {
  it("anuncia um erro como alerta e some sozinho depois de um tempo", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <Trigger message="Não foi possível apagar a transação." tone="error" />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "mostrar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível apagar a transação.");

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("um aviso informativo é um status, e pode ser fechado na hora", async () => {
    render(
      <ToastProvider>
        <Trigger message="Categoria arquivada." />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "mostrar" }));
    expect(screen.getByRole("status")).toHaveTextContent("Categoria arquivada.");

    await userEvent.click(screen.getByRole("button", { name: "Fechar aviso" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("mostra no máximo três avisos de uma vez", async () => {
    render(
      <ToastProvider>
        <Trigger message="falhou" tone="error" />
      </ToastProvider>,
    );

    for (let i = 0; i < 5; i++) await userEvent.click(screen.getByRole("button", { name: "mostrar" }));

    expect(screen.getAllByRole("alert")).toHaveLength(3);
  });
});
