import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegisterPage } from "./RegisterPage";
import { ApiError } from "../../shared/api/problem";

const mocks = vi.hoisted(() => ({ register: vi.fn() }));
vi.mock("./authApi", () => ({ register: mocks.register }));

function open() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function fillAndSubmit(password = "senha12345") {
  await userEvent.type(screen.getByLabelText("Nome"), "Ana Souza");
  await userEvent.type(screen.getByLabelText("E-mail"), "ana@exemplo.dev");
  await userEvent.type(screen.getByLabelText("Senha"), password);
  await userEvent.click(screen.getByRole("button", { name: "Criar conta" }));
}

beforeEach(() => {
  mocks.register.mockReset();
});

describe("RegisterPage", () => {
  it("depois de enviar, pede para conferir o e-mail em vez de entrar", async () => {
    mocks.register.mockResolvedValue("Enviamos um link para o seu e-mail. Abra-o em até 24 horas para ativar a conta.");
    open();

    await fillAndSubmit();

    expect(await screen.findByRole("heading", { name: "Confira seu e-mail." })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Abra-o em até 24 horas");
    expect(screen.getByRole("status")).toHaveTextContent("ana@exemplo.dev");
    expect(screen.getByText("Procure também na caixa de spam.")).toBeInTheDocument();
  });

  it("uma senha de vazamento conhecido aparece no campo da senha", async () => {
    mocks.register.mockRejectedValue(
      new ApiError(400, {
        detail: "Confira os campos destacados e tente de novo.",
        errors: { password: "Essa senha já apareceu em vazamentos de dados. Escolha outra." },
      }),
    );
    open();

    await fillAndSubmit("123456789");

    expect(await screen.findByText("Essa senha já apareceu em vazamentos de dados. Escolha outra.")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toHaveAttribute("aria-invalid", "true");
  });
});
