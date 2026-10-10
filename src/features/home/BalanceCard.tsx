import { usePrivacy } from "../../shared/privacy/PrivacyProvider";
import { Money } from "../../shared/ui/Money";
import { EyeIcon, EyeOffIcon } from "../../shared/ui/icons";
import { monthName } from "../../shared/lib/dates";

type Props = { month: string; income: number; expense: number; saving: number };

export function BalanceCard({ month, income, expense, saving }: Props) {
  const { hidden, toggle } = usePrivacy();
  const balance = income - expense - saving;
  const expenseShare = income > 0 ? Math.min((expense / income) * 100, 100) : 0;
  const savingShare = income > 0 ? Math.min((saving / income) * 100, 100 - expenseShare) : 0;

  return (
    <section className="flex flex-col gap-4 rounded-hero bg-surface p-6 shadow-card">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-muted">Saldo de {monthName(month)}</span>
        <button
          type="button"
          onClick={toggle}
          aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-800 transition active:scale-95"
        >
          {hidden ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      <Money
        value={balance}
        className={`font-display text-4xl font-bold tracking-tight ${balance < 0 ? "text-danger" : ""}`}
      />

      {income > 0 && (
        <div className="flex h-2.5 gap-1" aria-hidden="true">
          <div className="rounded-full bg-expense" style={{ width: `${expenseShare}%` }} />
          <div className="rounded-full bg-saving" style={{ width: `${savingShare}%` }} />
          <div className="flex-1 rounded-full bg-track" />
        </div>
      )}

      <dl className="grid grid-cols-3 gap-2">
        <Figure label="Entrou" dot="bg-income" value={income} />
        <Figure label="Saiu" dot="bg-expense" value={expense} />
        <Figure label="Guardou" dot="bg-saving" value={saving} />
      </dl>

      <p className="rounded-2xl bg-ink-800 px-4 py-3 text-sm leading-snug text-text-soft">
        {income > 0 ? (
          <>Já entraram <Money value={income} /> neste mês. Os limites em porcentagem já consideram esse valor.</>
        ) : (
          <>Sua receita deste mês ainda não entrou. Os limites em porcentagem vão subir quando ela chegar.</>
        )}
      </p>
    </section>
  );
}

function Figure({ label, dot, value }: { label: string; dot: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {label}
      </dt>
      <dd className="m-0 text-[15px] font-bold">
        <Money value={value} />
      </dd>
    </div>
  );
}