import { describe, expect, it } from "vitest";
import { filenameFrom } from "./accountApi";

describe("filenameFrom", () => {
  it("usa o nome de arquivo que a API sugere", () => {
    expect(filenameFrom('attachment; filename="life-and-money-2026-10-30.json"')).toBe(
      "life-and-money-2026-10-30.json",
    );
    expect(filenameFrom("attachment; filename=dados.json")).toBe("dados.json");
  });

  it("não inventa um nome quando a API não manda", () => {
    expect(filenameFrom(null)).toBeUndefined();
    expect(filenameFrom("attachment")).toBeUndefined();
  });
});
