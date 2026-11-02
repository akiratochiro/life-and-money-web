import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionForm } from "./TransactionForm";
import type { TransactionInput } from "./transactionsApi";
import type { Category } from "../categories/categoriesApi";
import { ToastProvider } from "../../shared/toast/ToastProvider";

const mocks = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn() }));
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

const ok = (data: unknown, status = 200) => ({ data, response: new Response(null, { status }) });
const problem = (status: number, detail: string) => ({ error: { detail }, response: new Response(null, { status }) });

function category(id: number, name: string, type: Category["type"]): Category {
  return { id, name, type, archived: false, color: "CORAL", icon: "OTHER", createdAt: "" } as Category;
}

const MARKET = category(1, "Mercado", "EXPENSE");
const SALARY = category(2, "Salário", "INCOME");
const RESERVE = category(3, "Reserva", "SAVING");

let onSubmit: ReturnType<typeof vi.fn<(input: TransactionInput) => void>>;
/** O "servidor": a categoria criada passa a vir na lista, como na API de verdade. */
let stored: Category[];

/** POST /categories que aceita e guarda a categoria. */
function acceptCategory(created: Category) {
  mocks.POST.mockImplementation(() => {
    stored = [...stored, created];
    return Promise.resolve(ok(created, 201));
  });
}

function renderForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <TransactionForm submitLabel="Salvar" pending={false} error={null} onSubmit={onSubmit} />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

const sheet = () => screen.getByRole("dialog", { hidden: true });

beforeEach(() => {
  vi.clearAllMocks();
  onSubmit = vi.fn<(input: TransactionInput) => void>();
  stored = [MARKET, SALARY, RESERVE];
  mocks.GET.mockImplementation((path: string) => Promise.resolve(ok(path === "/categories" ? stored : [])));
});

describe("criar categoria sem sair da transação", () => {
  it("o + abre o pop-up, cria a categoria do tipo da transação e já a deixa escolhida", async () => {
    const user = userEvent.setup();
    acceptCategory(category(9, "Academia", "EXPENSE"));
    renderForm();

    await user.click(await screen.findByRole("button", { name: "Nova categoria" }));
    expect(sheet()).toHaveAttribute("open");
    expect(within(sheet()).getByLabelText("Nome")).toHaveFocus();

    await user.type(within(sheet()).getByLabelText("Nome"), "  Academia ");
    await user.click(within(sheet()).getByRole("button", { name: "Criar e usar" }));

    expect(mocks.POST).toHaveBeenCalledWith("/categories", {
      body: { name: "Academia", type: "EXPENSE", color: "CORAL", icon: "OTHER" },
    });
    await waitFor(() => expect(sheet()).not.toHaveAttribute("open"));
    expect(await screen.findByRole("button", { name: /Academia/, pressed: true })).toBeInTheDocument();
    // Criar a categoria não envia a transação junto.
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("em Entrou, a categoria nasce como receita", async () => {
    const user = userEvent.setup();
    acceptCategory(category(9, "Freelance", "INCOME"));
    renderForm();

    await user.click(screen.getByRole("button", { name: "Entrou" }));
    await user.click(await screen.findByRole("button", { name: "Nova categoria" }));
    await user.type(within(sheet()).getByLabelText("Nome"), "Freelance");
    await user.click(within(sheet()).getByRole("button", { name: "Criar e usar" }));

    expect(mocks.POST).toHaveBeenCalledWith("/categories", {
      body: { name: "Freelance", type: "INCOME", color: "MINT", icon: "COIN" },
    });
    expect(await screen.findByRole("button", { name: /Freelance/, pressed: true })).toBeInTheDocument();
  });

  it("um nome repetido fica no pop-up com o motivo, sem fechar", async () => {
    const user = userEvent.setup();
    mocks.POST.mockResolvedValue(problem(409, "Já existe."));
    renderForm();

    await user.click(await screen.findByRole("button", { name: "Nova categoria" }));
    await user.type(within(sheet()).getByLabelText("Nome"), "Mercado");
    await user.click(within(sheet()).getByRole("button", { name: "Criar e usar" }));

    expect(await within(sheet()).findByRole("alert")).toHaveTextContent(
      "Já existe uma categoria ativa com esse nome e esse tipo.",
    );
    expect(sheet()).toHaveAttribute("open");
  });

  it("fechar descarta o rascunho", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(await screen.findByRole("button", { name: "Nova categoria" }));
    await user.type(within(sheet()).getByLabelText("Nome"), "Rascunho");
    await user.click(within(sheet()).getByRole("button", { name: "Fechar" }));
    await user.click(screen.getByRole("button", { name: "Nova categoria" }));

    expect(within(sheet()).getByLabelText("Nome")).toHaveValue("");
    expect(mocks.POST).not.toHaveBeenCalled();
  });

  it("em Guardou não há o +", async () => {
    const user = userEvent.setup();
    renderForm();

    await screen.findByRole("button", { name: "Nova categoria" });
    await user.click(screen.getByRole("button", { name: "Guardou" }));

    expect(await screen.findByRole("button", { name: /Reserva/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nova categoria" })).not.toBeInTheDocument();
  });
});
