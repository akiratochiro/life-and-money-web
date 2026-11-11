import { useState } from "react";
import { usePartners, useRegimes, useUndoRegimeChange } from "./companyApi";
import { ArchivedNotice } from "./CompanyLayout";
import { useCompanyContext } from "./companyContext";
import { RevenueCard } from "../invoices/RevenueCard";
import { MonthCards } from "../companyOverview/MonthCards";
import { UpcomingCard } from "../companyOverview/UpcomingCard";
import { RegimeChangeSheet } from "./RegimeChangeSheet";
import { MANUAL_TAXES_NOTICE, hasAutomaticTaxes, regimeLabel } from "./regimeOptions";
import { regimePeriod } from "./regimePeriod";
import { formatCnpj } from "./cnpj";
import { Card } from "../../shared/ui/Card";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { formatDate, monthLabel } from "../../shared/lib/dates";
import { formatCents, toCents } from "../../shared/lib/money";

/**
 * A visão geral: os cards do mês e os próximos vencimentos (Fase 5), a receita por competência, os
 * dados e o histórico de enquadramento.
 */
export function CompanyOverviewPage() {
  const company = useCompanyContext();
  const partners = usePartners(company.id);
  const me = partners.data?.find((partner) => partner.me);

  return (
    <div className="flex flex-col gap-4">
      {company.archived && <ArchivedNotice company={company} />}
      {!hasAutomaticTaxes(company.currentRegime.taxRegime) && (
        <p role="note" className="rounded-2xl bg-warning-soft p-4 text-sm font-semibold text-warning-strong">
          {MANUAL_TAXES_NOTICE}
        </p>
      )}

      <MonthCards companyId={company.id} />
      <UpcomingCard companyId={company.id} />
      <RevenueCard companyId={company.id} />

      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-base font-semibold">Dados da empresa</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-text-muted">CNPJ</dt>
          <dd className="font-semibold tabular-nums">{company.cnpj ? formatCnpj(company.cnpj) : "Não informado"}</dd>
          <dt className="text-text-muted">Abertura</dt>
          <dd className="font-semibold">{formatDate(company.openingDate)}</dd>
          <dt className="text-text-muted">Sócio</dt>
          <dd className="font-semibold">{me ? `${me.name} (você)` : "…"}</dd>
          <dt className="text-text-muted">Saldo inicial</dt>
          <dd className="font-semibold tabular-nums">
            {formatCents(toCents(company.openingBalance))} em {formatDate(company.openingBalanceDate)}
          </dd>
        </dl>
      </Card>

      <RegimeHistory />
    </div>
  );
}

function RegimeHistory() {
  const company = useCompanyContext();
  const regimes = useRegimes(company.id);
  const undo = useUndoRegimeChange(company.id);
  const [changing, setChanging] = useState(false);
  const [confirmingUndo, setConfirmingUndo] = useState(false);

  const history = regimes.data ?? [];
  const latest = history.at(-1);
  const newestFirst = [...history].reverse();

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="font-display text-base font-semibold">Enquadramento</h2>
      {regimes.isPending ? (
        <div className="h-16 motion-safe:animate-pulse rounded-2xl bg-sunken" />
      ) : (
        <ol className="flex flex-col gap-3">
          {newestFirst.map((regime) => (
            <li key={regime.id} className="flex flex-col gap-0.5 rounded-2xl bg-sunken p-3">
              <span className="font-semibold">{regimeLabel(regime)}</span>
              <span className="text-sm text-text-muted">{regimePeriod(regime)}</span>
            </li>
          ))}
        </ol>
      )}

      {!company.archived && latest && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setChanging(true)}
            className="-my-1 flex min-h-11 items-center self-start text-sm font-bold text-link"
          >
            Mudar enquadramento
          </button>
          {history.length > 1 &&
            (confirmingUndo ? (
              <div className="flex flex-col gap-2 rounded-2xl bg-sunken p-3">
                <p className="text-sm text-text-soft">
                  Desfazer a mudança de {monthLabel(latest.validFrom).toLowerCase()}? O enquadramento anterior volta a
                  valer sem data de fim.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={undo.isPending}
                    onClick={() => undo.mutate(undefined, { onSuccess: () => setConfirmingUndo(false) })}
                    className="flex min-h-11 items-center rounded-full px-4 text-sm font-bold text-danger-strong disabled:opacity-60"
                  >
                    <PendingLabel pending={undo.isPending} pendingText="Desfazendo…">Desfazer</PendingLabel>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingUndo(false)}
                    className="flex min-h-11 items-center rounded-full px-4 text-sm font-bold text-text-muted"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingUndo(true)}
                className="-my-1 flex min-h-11 items-center self-start text-sm font-bold text-text-muted"
              >
                Desfazer última mudança
              </button>
            ))}
          {undo.error && (
            <p role="alert" className="text-sm font-semibold text-danger-strong">
              {undo.error.message}
            </p>
          )}
        </div>
      )}

      {changing && latest && (
        <RegimeChangeSheet key={latest.id} companyId={company.id} latest={latest} open onClose={() => setChanging(false)} />
      )}
    </Card>
  );
}
