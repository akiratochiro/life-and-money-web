import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeAll, describe, expect, it } from "vitest";
import { AppShell } from "./AppShell";

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
  render(<RouterProvider router={router} />);
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
