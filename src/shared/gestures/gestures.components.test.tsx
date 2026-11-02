import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { MonthSwipe } from "./MonthSwipe";
import { PullToRefresh } from "./PullToRefresh";

function swipe(element: Element, from: [number, number], to: [number, number]) {
  fireEvent.touchStart(element, { touches: [{ clientX: from[0], clientY: from[1] }] });
  fireEvent.touchEnd(element, { changedTouches: [{ clientX: to[0], clientY: to[1] }] });
}

describe("MonthSwipe", () => {
  function open(onChange = vi.fn()) {
    render(
      <MonthSwipe month="2026-11" onChange={onChange}>
        <p>conteúdo do mês</p>
      </MonthSwipe>,
    );
    return { onChange, area: screen.getByText("conteúdo do mês") };
  }

  it("arrastar para a esquerda vai para o próximo mês, para a direita volta", () => {
    const { onChange, area } = open();

    swipe(area, [300, 400], [180, 410]);
    expect(onChange).toHaveBeenLastCalledWith("2026-12");

    swipe(area, [100, 400], [240, 395]);
    expect(onChange).toHaveBeenLastCalledWith("2026-10");
  });

  it("rolar a tela não troca de mês", () => {
    const { onChange, area } = open();

    swipe(area, [200, 600], [150, 300]);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("um toque que começa na borda é do sistema (o voltar do iOS), não do app", () => {
    const { onChange, area } = open();

    swipe(area, [8, 400], [200, 400]);

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("PullToRefresh", () => {
  function open() {
    const queryClient = new QueryClient();
    let finish = () => {};
    const refetch = vi
      .spyOn(queryClient, "refetchQueries")
      .mockImplementation(() => new Promise<void>((resolve) => (finish = resolve)));
    render(
      <QueryClientProvider client={queryClient}>
        <PullToRefresh>
          <p>conteúdo</p>
        </PullToRefresh>
      </QueryClientProvider>,
    );
    return { refetch, area: screen.getByText("conteúdo"), finish: () => finish() };
  }

  function pull(area: Element, distance: number) {
    fireEvent.touchStart(area, { touches: [{ clientX: 200, clientY: 100 }] });
    fireEvent.touchMove(area, { touches: [{ clientX: 200, clientY: 100 + distance }] });
    fireEvent.touchEnd(area, { changedTouches: [{ clientX: 200, clientY: 100 + distance }] });
  }

  it("puxar além do limite recarrega o que está na tela e avisa enquanto atualiza", async () => {
    const { refetch, area, finish } = open();

    pull(area, 200);

    expect(refetch).toHaveBeenCalledWith({ type: "active" });
    expect(screen.getByRole("status")).toHaveTextContent("Atualizando…");
    finish();
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });

  it("um puxão curto não recarrega", () => {
    const { refetch, area } = open();

    pull(area, 60);

    expect(refetch).not.toHaveBeenCalled();
  });
});
