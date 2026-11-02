import { afterEach, describe, expect, it, vi } from "vitest";
import { confirmHaptic } from "./haptics";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("confirmHaptic", () => {
  it("vibra curto quando o aparelho permite (Android)", () => {
    const vibrate = vi.fn(() => true);
    vi.stubGlobal("navigator", { vibrate });

    confirmHaptic();

    expect(vibrate).toHaveBeenCalledWith(15);
  });

  it("no iOS, sem navigator.vibrate, não faz nada e não quebra", () => {
    vi.stubGlobal("navigator", {});

    expect(() => confirmHaptic()).not.toThrow();
  });

  it("se o navegador recusar com erro, o erro não escapa", () => {
    vi.stubGlobal("navigator", { vibrate: () => { throw new Error("bloqueado"); } });

    expect(() => confirmHaptic()).not.toThrow();
  });
});
