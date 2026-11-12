import type { RevenueLimit, RevenueLimits } from "./companyOverviewApi";

/**
 * O limite que ganha a barra (decisão 33): no MEI, o único; no Simples, o próximo que ainda não foi
 * passado, ou o teto quando todos foram. Três barras para uma empresa pequena seriam ruído.
 */
export function mainLimit(data: RevenueLimits): RevenueLimit | undefined {
  return data.limits.find((limit) => limit.exceededIn == null) ?? data.limits.at(-1);
}

/** O percentual como o servidor escreve nas frases: sem arredondar para cima ("79%", nunca "80%" com 79,4%). */
export function percent(ratio: number): string {
  return `${Math.floor(ratio * 100)}%`;
}

/** O preenchimento e as marcas da barra, na escala até a tolerância (quando há) para os 120% caberem. */
export function barGeometry(revenue: number, limit: RevenueLimit) {
  const scale = limit.toleranceAmount ?? limit.amount;
  const clamp = (value: number) => Math.min(Math.max(value, 0), 1) * 100;
  return {
    fill: clamp(revenue / scale),
    limitAt: clamp(limit.amount / scale),
  };
}
