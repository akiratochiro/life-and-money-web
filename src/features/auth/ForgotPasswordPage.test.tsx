import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { ForgotPasswordPage } from "./ForgotPasswordPage";

const message = "Se existir uma conta com esse e-mail, enviamos um link para criar uma senha nova. Ele vale por 30 minutos.";
const mocks = vi.hoisted(() => ({ requestPasswordReset: vi.fn<(email: string) => Promise<string>>() }));
vi.mock("./authApi", () => ({ requestPasswordReset: mocks.requestPasswordReset }));

describe("ForgotPasswordPage", () => {
  it("mostra a mensagem da API, que é a mesma exista ou não a conta", async () => {
    mocks.requestPasswordReset.mockResolvedValue(message);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <ForgotPasswordPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await userEvent.type(screen.getByLabelText("E-mail"), "ana@exemplo.dev");
    await userEvent.click(screen.getByRole("button", { name: "Enviar link" }));

    expect(mocks.requestPasswordReset).toHaveBeenCalledWith("ana@exemplo.dev");
    expect(await screen.findByRole("status")).toHaveTextContent(message);
    expect(screen.queryByLabelText("E-mail")).not.toBeInTheDocument();
  });
});
