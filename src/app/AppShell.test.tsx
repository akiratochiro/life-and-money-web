import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./AppShell";

const mocks = vi.hoisted(() => ({ GET: vi.fn() }));
vi.mock("../shared/api/client", () => ({ api: mocks }));

type CompanyStub = { id: number; name: string; emoji: string };

/** As empresas ativas que a API devolve para o menu. */
function withCompanies(companies: CompanyStub[]) {
  mocks.GET.mockResolvedValue({ data: companies, response: new Response(null, { status: 200 }) });
}

beforeEach(() => withCompanies([]));

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

function open(path: string) {
  const router = createMemoryRouter(
    [{ element: <AppShell />, children: [{ path: "*", element: <p>conteúdo</p> }] }],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

function sidebar() {
  return screen
    .getAllByRole("navigation", { name: "Navegação principal" })
    .find((nav) => !within(nav).queryByRole("button", { name: "Mais" }))!;
}

/** A barra de baixo é a navegação principal que tem o botão "Mais". */
function bottomNav() {
  return screen
    .getAllByRole("navigation", { name: "Navegação principal" })
    .find((nav) => within(nav).queryByRole("button", { name: "Mais" }))!;
}

describe("AppShell no celular", () => {
  it("a barra de baixo tem Início e Extrato, o + no meio, e Orçamento e Mais", () => {
    open("/");
    const nav = bottomNav();

    const targets = [...nav.children].map((child) => child.getAttribute("aria-label") ?? child.textContent);
    expect(targets).toEqual(["Início", "Extrato", "Nova transação", "Orçamento", "Mais"]);
  });

  it("o Mais abre uma folha com as outras telas, e escolher uma fecha a folha", async () => {
    open("/");
    await userEvent.click(within(bottomNav()).getByRole("button", { name: "Mais" }));

    const sheet = screen.getByRole("dialog", { name: "Mais" });
    expect(sheet).toHaveAttribute("open");
    const links = within(sheet).getAllByRole("link").map((link) => link.textContent);
    expect(links).toEqual(["Metas", "Contas", "Análises", "Categorias", "Minha conta"]);

    await userEvent.click(within(sheet).getByRole("link", { name: "Contas" }));
    expect(sheet).not.toHaveAttribute("open");
  });

  it("numa tela do Mais, é o Mais que fica marcado na barra", () => {
    open("/bills");

    expect(within(bottomNav()).getByRole("button", { name: "Mais" })).toHaveClass("text-accent");
  });

  it("em Metas, que agora mora no Mais, é o Mais que fica marcado", () => {
    open("/goals");

    expect(within(bottomNav()).getByRole("button", { name: "Mais" })).toHaveClass("text-accent");
  });

  it("no desktop, a sidebar mantém a ordem de sempre, com Metas depois de Orçamento", () => {
    open("/");
    const sidebar = screen
      .getAllByRole("navigation", { name: "Navegação principal" })
      .find((nav) => !within(nav).queryByRole("button", { name: "Mais" }))!;

    const links = within(sidebar).getAllByRole("link").map((link) => link.textContent);
    expect(links).toEqual(["Início", "Extrato", "Orçamento", "Metas", "Contas", "Análises", "Categorias", "Minha conta"]);
  });

  it("a nova transação é tela cheia: sem a barra de baixo", () => {
    open("/transactions/new");

    expect(screen.queryByRole("button", { name: "Mais" })).not.toBeInTheDocument();
  });
});

describe("Minha Empresa no menu", () => {
  it("sem empresa ativa, não aparece", async () => {
    open("/");

    await waitFor(() => expect(mocks.GET).toHaveBeenCalled());
    expect(within(sidebar()).queryByText("Minha Empresa")).not.toBeInTheDocument();
  });

  it("com uma empresa, é um item logo abaixo do Início que leva direto a ela", async () => {
    withCompanies([{ id: 7, name: "Ana Design", emoji: "🎨" }]);
    open("/");

    expect(await within(sidebar()).findByRole("link", { name: "Minha Empresa" })).toHaveAttribute("href", "/companies/7");
    const links = within(sidebar()).getAllByRole("link").map((link) => link.textContent);
    expect(links.slice(0, 3)).toEqual(["Início", "Minha Empresa", "Extrato"]);
  });

  it("com várias, mostra cada empresa com emoji e nome, abaixo do título", async () => {
    withCompanies([
      { id: 7, name: "Ana Design", emoji: "🎨" },
      { id: 8, name: "Consultoria", emoji: "💼" },
    ]);
    open("/companies/8");

    const group = await within(sidebar()).findByRole("group", { name: "Minha Empresa" });
    const links = within(group).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["🎨Ana Design", "💼Consultoria"]);
    expect(links[1]).toHaveClass("text-accent");
  });

  it("no celular, as empresas ficam no topo do Mais, que fica marcado na página da empresa", async () => {
    withCompanies([{ id: 7, name: "Ana Design", emoji: "🎨" }]);
    open("/companies/7");

    await userEvent.click(within(bottomNav()).getByRole("button", { name: "Mais" }));
    const sheet = screen.getByRole("dialog", { name: "Mais" });
    const companies = await within(sheet).findByRole("navigation", { name: "Minhas empresas" });
    expect(within(companies).getByRole("link", { name: /Ana Design/ })).toHaveAttribute("href", "/companies/7");
    expect(within(bottomNav()).getByRole("button", { name: "Mais" })).toHaveClass("text-accent");
  });
});
