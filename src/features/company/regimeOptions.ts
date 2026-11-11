import type { AnnexConfig, CompanyRegime, LegalNature, MeiActivity, TaxRegime } from "./companyApi";

/**
 * As escolhas de enquadramento do formulário. Espelha as regras da API (RegimeRules) só para a
 * experiência: os dropdowns oferecem apenas combinações possíveis. Quem decide é o servidor, e um
 * erro dele aparece no campo.
 */

export const LEGAL_NATURES: { value: LegalNature; label: string }[] = [
  { value: "MEI", label: "MEI (Microempreendedor Individual)" },
  { value: "EI", label: "Empresário Individual (EI)" },
  { value: "SLU", label: "Sociedade Limitada Unipessoal (SLU)" },
  { value: "LTDA", label: "Sociedade Limitada (LTDA)" },
  { value: "SOCIEDADE_SIMPLES", label: "Sociedade Simples" },
];

export const TAX_REGIME_LABEL: Record<TaxRegime, string> = {
  SIMEI: "SIMEI",
  SIMPLES_NACIONAL: "Simples Nacional",
  LUCRO_PRESUMIDO: "Lucro Presumido",
  LUCRO_REAL: "Lucro Real",
};

export const ANNEX_OPTIONS: { value: AnnexConfig; label: string }[] = [
  { value: "FATOR_R", label: "Pelo Fator R (Anexo III ou V)" },
  { value: "ANEXO_III_FIXO", label: "Sempre Anexo III" },
];

export const MEI_ACTIVITIES: { value: MeiActivity; label: string }[] = [
  { value: "SERVICOS", label: "Serviços" },
  { value: "COMERCIO_INDUSTRIA", label: "Comércio ou indústria" },
  { value: "AMBOS", label: "Comércio e serviços" },
];

export const FATOR_R_HELP =
  "Algumas atividades de serviço (como TI, consultoria e engenharia) ficam no Anexo III quando a folha " +
  "(pró-labore e salários) é pelo menos 28% do faturamento dos últimos 12 meses, o chamado Fator R, e " +
  "no Anexo V quando é menos. Outras ficam sempre no Anexo III. Na dúvida, confirme pelo CNAE com seu contador.";

export const ANNEX_IV_NOTICE =
  "Atividades do Anexo IV (como advocacia e construção civil) ainda não têm cálculo de impostos no app.";

export const MANUAL_TAXES_NOTICE =
  "No Lucro Presumido e no Lucro Real, o app não calcula os impostos: você lança os valores à mão.";

export type RegimeSelection = {
  legalNature: LegalNature | null;
  taxRegime: TaxRegime | null;
  annexConfig: AnnexConfig | null;
  meiActivity: MeiActivity | null;
};

export const EMPTY_SELECTION: RegimeSelection = {
  legalNature: null,
  taxRegime: null,
  annexConfig: null,
  meiActivity: null,
};

/** O MEI só pode estar no SIMEI; as outras naturezas, em qualquer regime menos o SIMEI. */
export function regimesFor(nature: LegalNature | null): TaxRegime[] {
  if (nature === null) return [];
  return nature === "MEI" ? ["SIMEI"] : ["SIMPLES_NACIONAL", "LUCRO_PRESUMIDO", "LUCRO_REAL"];
}

export const needsAnnex = (regime: TaxRegime | null) => regime === "SIMPLES_NACIONAL";
export const needsActivity = (nature: LegalNature | null) => nature === "MEI";
export const hasAutomaticTaxes = (regime: TaxRegime | null) => regime === "SIMEI" || regime === "SIMPLES_NACIONAL";

/**
 * Trocar a natureza ajusta o resto: o MEI trava o regime no SIMEI, sair do MEI tira o SIMEI e a
 * atividade, e o anexo some fora do Simples. O que continua válido fica como estava.
 */
export function withNature(selection: RegimeSelection, nature: LegalNature): RegimeSelection {
  const regimes = regimesFor(nature);
  const taxRegime =
    nature === "MEI" ? "SIMEI" : selection.taxRegime && regimes.includes(selection.taxRegime) ? selection.taxRegime : null;
  return {
    legalNature: nature,
    taxRegime,
    annexConfig: needsAnnex(taxRegime) ? selection.annexConfig : null,
    meiActivity: needsActivity(nature) ? selection.meiActivity : null,
  };
}

export function withRegime(selection: RegimeSelection, regime: TaxRegime): RegimeSelection {
  return { ...selection, taxRegime: regime, annexConfig: needsAnnex(regime) ? selection.annexConfig : null };
}

/** Tudo o que o enquadramento escolhido exige está preenchido. */
export function isComplete(selection: RegimeSelection): boolean {
  return (
    selection.legalNature !== null &&
    selection.taxRegime !== null &&
    (!needsAnnex(selection.taxRegime) || selection.annexConfig !== null) &&
    (!needsActivity(selection.legalNature) || selection.meiActivity !== null)
  );
}

/** O enquadramento para a API, sem os campos que não se aplicam (a API recusa anexo fora do Simples). */
export function toPayload(selection: RegimeSelection) {
  if (!isComplete(selection)) throw new Error("Enquadramento incompleto");
  return {
    legalNature: selection.legalNature!,
    taxRegime: selection.taxRegime!,
    annexConfig: selection.annexConfig ?? undefined,
    meiActivity: selection.meiActivity ?? undefined,
  };
}

/** "MEI · SIMEI · Serviços", "SLU · Simples Nacional · Fator R". */
export function regimeLabel(regime: Pick<CompanyRegime, "legalNature" | "taxRegime" | "annexConfig" | "meiActivity">): string {
  const parts: string[] = [regime.legalNature === "SOCIEDADE_SIMPLES" ? "Sociedade Simples" : regime.legalNature];
  parts.push(TAX_REGIME_LABEL[regime.taxRegime]);
  if (regime.annexConfig) parts.push(regime.annexConfig === "FATOR_R" ? "Fator R" : "Anexo III");
  if (regime.meiActivity) parts.push(MEI_ACTIVITIES.find((option) => option.value === regime.meiActivity)!.label);
  return parts.join(" · ");
}
