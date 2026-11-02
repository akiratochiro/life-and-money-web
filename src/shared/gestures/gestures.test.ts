import { describe, expect, it } from "vitest";
import { PULL_MAX, pullDistance, pullReady, startsAtEdge, swipeDirection } from "./gestures";

describe("swipeDirection", () => {
  it("um arrasto lateral claro é um swipe, para o lado do movimento", () => {
    expect(swipeDirection(-80, 10)).toBe("left");
    expect(swipeDirection(90, -15)).toBe("right");
  });

  it("um arrasto curto não é swipe", () => {
    expect(swipeDirection(-40, 0)).toBeNull();
  });

  it("um movimento mais vertical é rolagem, não swipe", () => {
    expect(swipeDirection(-80, 70)).toBeNull();
    expect(swipeDirection(60, 200)).toBeNull();
  });
});

describe("startsAtEdge", () => {
  it("as bordas da tela ficam para os gestos do sistema", () => {
    expect(startsAtEdge(10, 390)).toBe(true);
    expect(startsAtEdge(380, 390)).toBe(true);
    expect(startsAtEdge(195, 390)).toBe(false);
  });
});

describe("puxar para atualizar", () => {
  it("o indicador desce metade do arrasto, até um teto", () => {
    expect(pullDistance(-30)).toBe(0);
    expect(pullDistance(100)).toBe(50);
    expect(pullDistance(1000)).toBe(PULL_MAX);
  });

  it("só atualiza depois de passar do limite", () => {
    expect(pullReady(100)).toBe(false);
    expect(pullReady(140)).toBe(true);
  });
});
