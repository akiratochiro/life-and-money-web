import { describe, expect, it } from "vitest";
import {
  EMPTY_SELECTION,
  isComplete,
  regimeLabel,
  regimesFor,
  toPayload,
  withNature,
  withRegime,
  type RegimeSelection,
} from "./regimeOptions";

describe("as combinações de enquadramento", () => {
  it("o MEI só tem o SIMEI; as outras naturezas têm tudo menos o SIMEI", () => {
    expect(regimesFor("MEI")).toEqual(["SIMEI"]);
    for (const nature of ["EI", "SLU", "LTDA", "SOCIEDADE_SIMPLES"] as const) {
      expect(regimesFor(nature)).toEqual(["SIMPLES_NACIONAL", "LUCRO_PRESUMIDO", "LUCRO_REAL"]);
    }
    expect(regimesFor(null)).toEqual([]);
  });

  it("escolher MEI trava o regime no SIMEI", () => {
    expect(withNature(EMPTY_SELECTION, "MEI")).toEqual({ ...EMPTY_SELECTION, legalNature: "MEI", taxRegime: "SIMEI" });
  });

  it("sair do MEI tira o SIMEI e a atividade", () => {
    const mei: RegimeSelection = { legalNature: "MEI", taxRegime: "SIMEI", annexConfig: null, meiActivity: "SERVICOS" };

    expect(withNature(mei, "SLU")).toEqual({ ...EMPTY_SELECTION, legalNature: "SLU" });
  });

  it("trocar entre naturezas que não são MEI mantém o regime e o anexo", () => {
    const slu: RegimeSelection = { legalNature: "SLU", taxRegime: "SIMPLES_NACIONAL", annexConfig: "FATOR_R", meiActivity: null };

    expect(withNature(slu, "LTDA")).toEqual({ ...slu, legalNature: "LTDA" });
  });

  it("sair do Simples tira o anexo", () => {
    const slu: RegimeSelection = { legalNature: "SLU", taxRegime: "SIMPLES_NACIONAL", annexConfig: "FATOR_R", meiActivity: null };

    expect(withRegime(slu, "LUCRO_PRESUMIDO").annexConfig).toBeNull();
  });

  it("fica completo só com tudo o que o enquadramento exige", () => {
    expect(isComplete({ legalNature: "MEI", taxRegime: "SIMEI", annexConfig: null, meiActivity: null })).toBe(false);
    expect(isComplete({ legalNature: "MEI", taxRegime: "SIMEI", annexConfig: null, meiActivity: "AMBOS" })).toBe(true);
    expect(isComplete({ legalNature: "SLU", taxRegime: "SIMPLES_NACIONAL", annexConfig: null, meiActivity: null })).toBe(false);
    expect(isComplete({ legalNature: "SLU", taxRegime: "SIMPLES_NACIONAL", annexConfig: "ANEXO_III_FIXO", meiActivity: null })).toBe(true);
    expect(isComplete({ legalNature: "LTDA", taxRegime: "LUCRO_REAL", annexConfig: null, meiActivity: null })).toBe(true);
  });

  it("o que vai para a API não leva campo que não se aplica", () => {
    expect(toPayload({ legalNature: "LTDA", taxRegime: "LUCRO_REAL", annexConfig: null, meiActivity: null })).toEqual({
      legalNature: "LTDA",
      taxRegime: "LUCRO_REAL",
      annexConfig: undefined,
      meiActivity: undefined,
    });
  });

  it("o rótulo resume o enquadramento", () => {
    expect(regimeLabel({ legalNature: "MEI", taxRegime: "SIMEI", meiActivity: "SERVICOS" })).toBe("MEI · SIMEI · Serviços");
    expect(regimeLabel({ legalNature: "SLU", taxRegime: "SIMPLES_NACIONAL", annexConfig: "FATOR_R" })).toBe(
      "SLU · Simples Nacional · Fator R",
    );
    expect(regimeLabel({ legalNature: "SOCIEDADE_SIMPLES", taxRegime: "LUCRO_PRESUMIDO" })).toBe(
      "Sociedade Simples · Lucro Presumido",
    );
  });
});
