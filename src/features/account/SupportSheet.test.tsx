import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SupportSheet } from "./SupportSheet";

const mocks = vi.hoisted(() => ({ POST: vi.fn() }));
vi.mock("../../shared/api/client", () => ({ api: mocks }));

// O jsdom não implementa o <dialog> modal; o suficiente para abrir e fechar.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
});

// Com chaves: devolver o mock faria o vitest tratá-lo como limpeza e chamá-lo depois do teste.
beforeEach(() => {
  mocks.POST.mockReset();
});

function open() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <SupportSheet email="ana@exemplo.dev" open onClose={() => {}} />
    </QueryClientProvider>,
  );
}

describe("fale com o suporte", () => {
  it("manda o assunto e a mensagem, e diz que a resposta chega no e-mail da conta", async () => {
    mocks.POST.mockResolvedValue({ response: new Response(null, { status: 202 }) });
    open();

    const send = screen.getByRole("button", { name: "Enviar mensagem" });
    expect(send).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Assunto (opcional)"), "Dúvida no DAS");
    await userEvent.type(screen.getByLabelText("Mensagem"), "  O DAS de outubro veio diferente.  ");
    expect(screen.getByText(/de 3000 caracteres; no mínimo 10\./)).toBeInTheDocument();
    await userEvent.click(send);

    expect(mocks.POST).toHaveBeenCalledWith("/support", {
      body: { subject: "Dúvida no DAS", message: "O DAS de outubro veio diferente." },
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Mensagem enviada.A resposta chega no seu e-mail (ana@exemplo.dev).");
  });

  it("sem assunto, não manda o campo", async () => {
    mocks.POST.mockResolvedValue({ response: new Response(null, { status: 202 }) });
    open();

    await userEvent.type(screen.getByLabelText("Mensagem"), "Uma mensagem sem assunto.");
    await userEvent.click(screen.getByRole("button", { name: "Enviar mensagem" }));
    expect(mocks.POST).toHaveBeenCalledWith("/support", { body: { subject: undefined, message: "Uma mensagem sem assunto." } });
  });

  it("no limite de uso, diz quanto esperar", async () => {
    mocks.POST.mockResolvedValue({
      error: { status: 429, title: "Muitas tentativas", detail: "Muitas tentativas.", retryAfterSeconds: 120 },
      response: new Response(null, { status: 429 }),
    });
    open();

    await userEvent.type(screen.getByLabelText("Mensagem"), "Mais uma mensagem aqui.");
    await userEvent.click(screen.getByRole("button", { name: "Enviar mensagem" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Você já mandou várias mensagens. Tente de novo em 2:00.");
  });

  it("o erro de campo da API aparece no campo", async () => {
    mocks.POST.mockResolvedValue({
      error: { status: 400, title: "Dados inválidos", detail: "Dados inválidos.", errors: { message: "A mensagem deve ter entre 10 e 3.000 caracteres." } },
      response: new Response(null, { status: 400 }),
    });
    open();

    await userEvent.type(screen.getByLabelText("Mensagem"), "1234567890");
    await userEvent.click(screen.getByRole("button", { name: "Enviar mensagem" }));
    expect(await screen.findByText("A mensagem deve ter entre 10 e 3.000 caracteres.")).toBeInTheDocument();
    expect(screen.getByLabelText("Mensagem")).toHaveAttribute("aria-invalid", "true");
  });
});
