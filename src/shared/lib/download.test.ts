import { describe, expect, it } from "vitest";
import { filenameFromDisposition } from "./download";

describe("nome do arquivo no Content-Disposition", () => {
  it("prefere o filename* em UTF-8, que traz os acentos", () => {
    expect(
      filenameFromDisposition(`attachment; filename="=?UTF-8?Q?Nota_Out.xml?="; filename*=UTF-8''Nota%20Outubro%20%C3%A1.xml`),
    ).toBe("Nota Outubro á.xml");
  });

  it("sem filename*, usa o filename simples", () => {
    expect(filenameFromDisposition('attachment; filename="nota.xml"')).toBe("nota.xml");
  });

  it("sem cabeçalho, não inventa nome", () => {
    expect(filenameFromDisposition(null)).toBeUndefined();
  });
});
