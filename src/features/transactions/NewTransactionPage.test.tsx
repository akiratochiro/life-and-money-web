import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { NewTransactionPage } from "./NewTransactionPage";
import { ToastProvider } from "../../shared/toast/ToastProvider";
import { CelebrateProvider } from "../../shared/celebrate/CelebrateProvider";

const mocks = vi.hoisted(() => ({ GET: vi.fn(() => new Promise(() => {})) }));
vi.mock("../../shared/api/client", () => ({ api: mocks }));

describe("NewTransactionPage", () => {
  it("abre com o foco no valor e o teclado decimal", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ToastProvider>
          <CelebrateProvider>
            <MemoryRouter>
              <NewTransactionPage />
            </MemoryRouter>
          </CelebrateProvider>
        </ToastProvider>
      </QueryClientProvider>,
    );

    const amount = screen.getByLabelText("Valor");
    expect(amount).toHaveFocus();
    expect(amount).toHaveAttribute("inputmode", "decimal");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  });
});
