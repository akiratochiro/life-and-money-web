import { useState } from "react";
import { useProLaborePlans, useRemoveProLaborePlan, useSetProLaborePlan, useWithdrawals, type ProLaborePlan, type Withdrawal } from "./withdrawalsApi";
import { WithdrawalSheet } from "./WithdrawalSheet";
import { usePartners } from "../company/companyApi";
import { useCompanyContext } from "../company/companyContext";
import { EmptyState } from "../../shared/ui/EmptyState";
import { MoneyField } from "../../shared/ui/MoneyField";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { formatCents, toCents } from "../../shared/lib/money";

const money = (value: number) => formatCents(toCents(value));
const monthYear = (month: string) => `${month.slice(5, 7)}/${month.slice(0, 4)}`;

/**
 * A aba Retiradas: o pró-labore planejado de cada sócio (entra na previsão do DARF e do Fator R) e
 * os pró-labores pagos no ano. A distribuição de lucros chega na Fase 6, nesta mesma aba.
 */
export function WithdrawalsPage() {
  const company = useCompanyContext();
  const partners = usePartners(company.id);
  const plans = useProLaborePlans(company.id);
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const withdrawals = useWithdrawals(company.id, year);
  const [open, setOpen] = useState<Withdrawal | "new">();
  const partnerList = partners.data ?? [];
  const nameOf = (partnerId: number) => partnerList.find((p) => p.id === partnerId)?.name ?? "Sócio";
  const items = withdrawals.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="planned" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="planned" className="font-display text-lg font-semibold">Pró-labore planejado</h2>
          <p className="text-sm text-text-muted">Entra na previsão do DARF e do Fator R enquanto o mês não é registrado como pago.</p>
        </div>
        <ul className="flex flex-col overflow-hidden rounded-card bg-surface shadow-card">
          {partnerList.map((partner) => (
            <PlanRow key={partner.id} companyId={company.id} name={partner.name} partnerId={partner.id}
              plan={plans.data?.find((plan) => plan.partnerId === partner.id)} readOnly={company.archived} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="paid" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="paid" className="font-display text-lg font-semibold">Pagos</h2>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Ano anterior" onClick={() => setYear(year - 1)}
              className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-text-muted">‹</button>
            <span className="min-w-12 text-center font-bold tabular-nums">{year}</span>
            <button type="button" aria-label="Próximo ano" disabled={year >= thisYear} onClick={() => setYear(year + 1)}
              className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-text-muted disabled:opacity-30">›</button>
          </div>
        </div>
        {!company.archived && (
          <button type="button" onClick={() => setOpen("new")}
            className="h-12 self-start rounded-full bg-accent px-6 font-bold text-on-accent shadow-clay-accent transition active:scale-95">
            Registrar pró-labore
          </button>
        )}
        {withdrawals.isPending ? (
          <div className="h-24 motion-safe:animate-pulse rounded-card bg-sunken" />
        ) : items.length === 0 ? (
          <EmptyState>Nenhum pró-labore pago em {year}.</EmptyState>
        ) : (
          <ul aria-label={`Pró-labores de ${year}`} className="flex flex-col overflow-hidden rounded-card bg-surface shadow-card">
            {items.map((item) => (
              <li key={item.id} className="border-b border-line last:border-b-0">
                <button type="button" onClick={() => setOpen(item)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition active:bg-sunken">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">
                      Pró-labore {item.competenceMonth ? monthYear(item.competenceMonth) : ""}
                      {partnerList.length > 1 && ` · ${nameOf(item.partnerId)}`}
                    </span>
                    <span className="text-xs text-text-muted">
                      INSS {money(item.inssAmount)} · IRRF {money(item.irrfAmount)} · líquido {money(item.netAmount)}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">{money(item.grossAmount)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {open && (
        <WithdrawalSheet key={open === "new" ? "new" : open.id} companyId={company.id} partners={partnerList}
          withdrawal={open === "new" ? undefined : open} readOnly={company.archived} onClose={() => setOpen(undefined)} />
      )}
    </div>
  );
}

function PlanRow({ companyId, partnerId, name, plan, readOnly }: {
  companyId: number; partnerId: number; name: string; plan?: ProLaborePlan; readOnly: boolean;
}) {
  const set = useSetProLaborePlan(companyId);
  const remove = useRemoveProLaborePlan(companyId);
  const [editing, setEditing] = useState(false);
  const [cents, setCents] = useState(plan ? toCents(plan.grossAmount) : 0);
  const error = set.error ?? remove.error;

  return (
    <li className="flex flex-col gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <div className="flex items-center gap-3">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{name}</span>
          <span className="text-xs text-text-muted">
            {plan ? `${money(plan.grossAmount)} por mês, desde ${monthYear(plan.validFrom)}` : "Sem pró-labore planejado"}
          </span>
        </span>
        {!readOnly && !editing && (
          <button type="button" onClick={() => setEditing(true)} aria-label={`${plan ? "Mudar" : "Planejar"} o pró-labore de ${name}`}
            className="flex min-h-11 items-center px-2 text-sm font-bold text-link">
            {plan ? "Mudar" : "Planejar"}
          </button>
        )}
      </div>
      {editing && (
        <div className="flex flex-col gap-3 rounded-2xl bg-sunken p-3">
          <MoneyField label={`Pró-labore planejado de ${name}`} cents={cents} onChange={setCents}
            hint="Vale a partir deste mês; os meses anteriores ficam com o valor da época." />
          {error && <p role="alert" className="text-sm font-semibold text-danger-strong">{error.message}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={cents <= 0 || set.isPending}
              onClick={() => set.mutate({ partnerId, grossAmount: cents / 100 }, { onSuccess: () => setEditing(false) })}
              className="h-11 rounded-full bg-accent px-5 font-bold text-on-accent shadow-clay-accent disabled:opacity-60">
              <PendingLabel pending={set.isPending} pendingText="Salvando…">Salvar</PendingLabel>
            </button>
            <button type="button" onClick={() => setEditing(false)} className="h-11 rounded-full bg-surface px-5 font-bold">Cancelar</button>
            {plan && (
              <button type="button" disabled={remove.isPending}
                onClick={() => remove.mutate(partnerId, { onSuccess: () => setEditing(false) })}
                className="flex min-h-11 items-center px-2 text-sm font-bold text-danger-strong disabled:opacity-60">
                Parar de planejar
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}
