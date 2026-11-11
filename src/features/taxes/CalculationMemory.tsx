import type { ReactNode } from "react";
import type { TaxCalculation } from "./taxesApi";
import { formatRate, rbt12Explanation } from "./taxFormat";
import { Badge } from "../../shared/ui/Badge";
import { formatCents, toCents } from "../../shared/lib/money";

const money = (value: number) => formatCents(toCents(value));

function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line py-2 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-sm text-text-muted">{label}</dt>
        <dd className="text-right font-semibold tabular-nums">{children}</dd>
      </div>
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

/** De onde veio o previsto, linha a linha, para o usuário entender e conferir com o contador. */
export function CalculationMemory({ calculation }: { calculation: TaxCalculation }) {
  const { simples, simei, darf } = calculation;
  return (
    <section aria-label="Memória de cálculo" className="flex flex-col rounded-2xl bg-sunken px-3 py-1">
      <h3 className="pt-2 text-sm font-bold">Como o valor foi calculado</h3>
      <dl>
        {simples && (
          <>
            <Row label="Receita do mês">{money(simples.revenue)}</Row>
            {simples.revenueWithIssWithheld > 0 && (
              <Row label="Com ISS retido pelo cliente" hint="O ISS dessa parte já foi pago pelo cliente e sai do DAS.">
                {money(simples.revenueWithIssWithheld)}
              </Row>
            )}
            <Row label="Receita dos últimos 12 meses (RBT12)" hint={rbt12Explanation(simples)}>{money(simples.rbt12)}</Row>
            {simples.fatorR !== undefined && (
              <Row label="Fator R" hint={`Folha de ${money(simples.payroll ?? 0)} ÷ receita. A partir de 28%, Anexo III; abaixo, Anexo V.`}>
                {formatRate(simples.fatorR)}
              </Row>
            )}
            <Row label="Anexo e faixa">{`Anexo ${simples.annex}, faixa ${simples.bracket}`}</Row>
            <Row label="Alíquota nominal">{formatRate(simples.nominalRate)}</Row>
            {simples.deduction > 0 && <Row label="Parcela a deduzir">{money(simples.deduction)}</Row>}
            <Row label="Alíquota efetiva" hint="(RBT12 × nominal − parcela a deduzir) ÷ RBT12">{formatRate(simples.effectiveRate)}</Row>
            {simples.revenueWithIssWithheld > 0 && <Row label="Parte do ISS na alíquota">{formatRate(simples.issRate)}</Row>}
          </>
        )}
        {simei && (
          <>
            <Row label="INSS (5% do salário mínimo)">{money(simei.inss)}</Row>
            {simei.icms > 0 && <Row label="ICMS">{money(simei.icms)}</Row>}
            {simei.iss > 0 && <Row label="ISS">{money(simei.iss)}</Row>}
          </>
        )}
        {darf?.proLabores.map((line) => (
          <Row key={line.partnerId} label={line.partnerName}
            hint={`Pró-labore de ${money(line.gross)}: INSS ${money(line.inss)} + IRRF ${money(line.irrf)}`}>
            <span className="flex items-center justify-end gap-2">
              {!line.registered && <Badge tone="warning">planejado</Badge>}
              {money(line.inss + line.irrf)}
            </span>
          </Row>
        ))}
      </dl>
    </section>
  );
}
