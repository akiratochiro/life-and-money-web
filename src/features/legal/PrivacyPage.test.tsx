import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { PrivacyPage } from "./PrivacyPage";
import { LoginPage } from "../auth/LoginPage";
import { RegisterPage } from "../auth/RegisterPage";

function renderAt(ui: React.ReactNode) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Privacidade", () => {
  it("explica o que fica guardado, os cookies, onde os dados ficam e como exportar e excluir", () => {
    renderAt(<PrivacyPage />);

    for (const title of ["O que fica guardado", "O que não fica guardado", "Cookies e armazenamento no navegador",
      "Onde os dados ficam", "Seus direitos", "Contato"]) {
      expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    }
    // Os nomes dos cookies precisam bater com os da API (RefreshTokenCookie e LoginDeviceCookie).
    expect(screen.getByText("refreshToken")).toBeInTheDocument();
    expect(screen.getByText("loginDevice")).toBeInTheDocument();
  });

  it("dá para chegar nela pelo login e pelo cadastro, antes de ter conta", () => {
    renderAt(<LoginPage />);
    expect(screen.getByRole("link", { name: "Privacidade" })).toHaveAttribute("href", "/privacy");
  });

  it("o cadastro mostra como os dados são tratados", () => {
    renderAt(<RegisterPage />);
    expect(screen.getByRole("link", { name: "Como seus dados são tratados" })).toHaveAttribute("href", "/privacy");
  });
});
