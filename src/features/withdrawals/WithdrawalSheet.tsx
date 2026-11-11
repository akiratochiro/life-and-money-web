import { useState, type FormEvent } from "react";
import {
  useCreateWithdrawal,
  useDeleteWithdrawal,
  useLaunchWithdrawal,
  useUpdateWithdrawal,
  type Withdrawal,
  type WithdrawalInput,
} from "./withdrawalsApi";
import { useCategories } from "../categories/categoriesApi";
import type { components } from "../../shared/api/schema";
import { ApiError } from "../../shared/api/problem";
import { BottomSheet } from "../../shared/ui/BottomSheet";
import { MoneyField } from "../../shared/ui/MoneyField";
import { MonthSwitcher } from "../../shared/ui/MonthSwitcher";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { currentMonth, todayIso } from "../../shared/lib/dates";
import { formatCents, toCents } from "../../shared/lib/money";

type Partner = components["schemas"]["PartnerResponse"];
type Kind = WithdrawalInput["kind"];

/** O app calcula INSS e IRRF de 01/2026 em diante; antes, os valores vêm do holerite. */
const FIRST_CALCULATED = "2026-01";
/** As categorias que a API cria no primeiro lançamento, se o usuário ainda não tiver. */
const DEFAULT_CATEGORY: Record<Kind, string> = { PRO_LABORE: "Pró-labore", DISTRIBUICAO_LUCROS: "Lucros distribuídos" };

const money = (value: number) => formatCents(toCents(value));
const field = "h-14 rounded-2xl border border-line bg-sunken px-4 text-base text-text outline-none focus:border-accent [color-scheme:light]";

type Props = {
  companyId: number;
  partners: Partner[];
  withdrawal?: Withdrawal;
  /** Falso no MEI, que não tem pró-labore: só a distribuição de lucros. */
  allowProLabore: boolean;
  readOnly: boolean;
  onClose: () => void;
};

/**
 * Registrar, corrigir ou excluir uma retirada (pró-labore ou distribuição de lucros) e lançá-la nas
 * finanças pessoais (decisão 29). Depois de salvar, a do "sou eu" ganha o botão de lançar, e os avisos
 * da API aparecem antes de a folha fechar.
 */
export function WithdrawalSheet({ companyId, partners, withdrawal, allowProLabore, readOnly, onClose }: Props) {
  const [saved, setSaved] = useState<Withdrawal>();
  const shown = saved ?? withdrawal;
  const isMe = (w: Withdrawal) => partners.find((partner) => partner.id === w.partnerId)?.me ?? false;
  const title = withdrawal ? (withdrawal.kind === "PRO_LABORE" ? "Pró-labore" : "Distribuição de lucros") : "Registrar retirada";

  return (
    <BottomSheet title={title} open onClose={onClose}>
      {saved ? (
        <div className="flex flex-col gap-4 pt-2">
          <p className="font-semibold">Retirada salva.</p>
          <Summary withdrawal={saved} />
          {isMe(saved) && <LaunchOffer companyId={companyId} withdrawal={saved} onLaunched={setSaved} />}
          <button type="button" onClick={onClose} className="h-12 rounded-full bg-surface font-bold">Concluir</button>
        </div>
      ) : (
        <>
          {shown && (
            <div className="flex flex-col gap-3 pt-2">
              <Summary withdrawal={shown} />
              {!readOnly && isMe(shown) && <LaunchOffer companyId={companyId} withdrawal={shown} onLaunched={setSaved} />}
            </div>
          )}
          {!readOnly && (
            <WithdrawalForm companyId={companyId} partners={partners} withdrawal={withdrawal} allowProLabore={allowProLabore}
              onSaved={(result) => (result.warnings.length > 0 || isMe(result) ? setSaved(result) : onClose())} onDeleted={onClose} />
          )}
        </>
      )}
    </BottomSheet>
  );
}

function Summary({ withdrawal }: { withdrawal: Withdrawal }) {
  const proLabore = withdrawal.kind === "PRO_LABORE";
  return (
    <div className="flex flex-col gap-3">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-text-muted">{proLabore ? "Bruto" : "Distribuído"}</dt>
        <dd className="font-semibold tabular-nums">{money(withdrawal.grossAmount)}</dd>
        {proLabore && (
          <>
            <dt className="text-text-muted">INSS</dt><dd className="font-semibold tabular-nums">{money(withdrawal.inssAmount)}</dd>
          </>
        )}
        <dt className="text-text-muted">IRRF</dt><dd className="font-semibold tabular-nums">{money(withdrawal.irrfAmount)}</dd>
        <dt className="text-text-muted">Líquido</dt><dd className="font-semibold tabular-nums">{money(withdrawal.netAmount)}</dd>
      </dl>
      {!withdrawal.calculated && <p className="text-xs text-text-muted">INSS e IRRF informados, como no holerite.</p>}
      {withdrawal.warnings.map((warning) => (
        <p key={warning} role="note" className="rounded-2xl bg-warning-soft p-3 text-sm font-semibold text-warning-strong">{warning}</p>
      ))}
    </div>
  );
}

/** O "Lançar nas minhas finanças": a categoria padrão já escolhida, um toque lança (decisão da Fase 6). */
function LaunchOffer({ companyId, withdrawal, onLaunched }: {
  companyId: number; withdrawal: Withdrawal; onLaunched: (w: Withdrawal) => void;
}) {
  const launch = useLaunchWithdrawal(companyId);
  const categories = useCategories();
  const defaultName = DEFAULT_CATEGORY[withdrawal.kind];
  const income = (categories.data ?? []).filter((category) => category.type === "INCOME");
  const existingDefault = income.find((category) => category.name.toLocaleLowerCase("pt-BR") === defaultName.toLocaleLowerCase("pt-BR"));
  // "" é a categoria padrão: a API usa a que existe ou a cria no primeiro lançamento.
  const [choice, setChoice] = useState("");

  if (withdrawal.personalTransactionId !== undefined) {
    return <p className="rounded-2xl bg-income-soft p-3 text-sm font-semibold text-income-strong">Lançada nas suas finanças.</p>;
  }
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-sunken p-3">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-muted">Categoria nas suas finanças</span>
        <select value={choice} onChange={(e) => setChoice(e.target.value)} className={field.replace("bg-sunken", "bg-surface")}>
          <option value="">{existingDefault ? defaultName : `${defaultName} (nova)`}</option>
          {income.filter((category) => category.id !== existingDefault?.id).map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </label>
      {launch.error && <p role="alert" className="text-sm font-semibold text-danger-strong">{launch.error.message}</p>}
      <button type="button" disabled={launch.isPending}
        onClick={() => launch.mutate({ withdrawalId: withdrawal.id, categoryId: choice ? Number(choice) : undefined }, { onSuccess: onLaunched })}
        className="h-12 rounded-full bg-accent font-bold text-on-accent shadow-clay-accent disabled:opacity-60">
        <PendingLabel pending={launch.isPending} pendingText="Lançando…">Lançar {money(withdrawal.netAmount)} nas minhas finanças</PendingLabel>
      </button>
    </div>
  );
}

function WithdrawalForm({ companyId, partners, withdrawal, allowProLabore, onSaved, onDeleted }: {
  companyId: number; partners: Partner[]; withdrawal?: Withdrawal; allowProLabore: boolean;
  onSaved: (w: Withdrawal) => void; onDeleted: () => void;
}) {
  const create = useCreateWithdrawal(companyId);
  const update = useUpdateWithdrawal(companyId);
  const remove = useDeleteWithdrawal(companyId);
  const me = partners.find((partner) => partner.me) ?? partners[0];
  const [kind, setKind] = useState<Kind>(withdrawal?.kind ?? (allowProLabore ? "PRO_LABORE" : "DISTRIBUICAO_LUCROS"));
  const [partnerId, setPartnerId] = useState(withdrawal?.partnerId ?? me?.id);
  const [competence, setCompetence] = useState(withdrawal?.competenceMonth ?? currentMonth());
  const [paymentDate, setPaymentDate] = useState(withdrawal?.paymentDate ?? todayIso());
  const [gross, setGross] = useState(withdrawal ? toCents(withdrawal.grossAmount) : 0);
  const [inss, setInss] = useState(withdrawal && !withdrawal.calculated ? toCents(withdrawal.inssAmount) : 0);
  const [irrf, setIrrf] = useState(withdrawal && (!withdrawal.calculated || withdrawal.kind === "DISTRIBUICAO_LUCROS")
    ? toCents(withdrawal.irrfAmount) : 0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const proLabore = kind === "PRO_LABORE";
  const informed = proLabore && competence < FIRST_CALCULATED;
  const mutation = withdrawal ? update : create;
  const fieldErrors = mutation.error instanceof ApiError ? mutation.error.fieldErrors : {};
  const error = mutation.error ?? remove.error;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const body: WithdrawalInput = proLabore
      ? {
          partnerId: partnerId!, kind, competenceMonth: competence, paymentDate, grossAmount: gross / 100,
          inssAmount: informed ? inss / 100 : undefined, irrfAmount: informed ? irrf / 100 : undefined,
        }
      : { partnerId: partnerId!, kind, paymentDate, grossAmount: gross / 100, irrfAmount: irrf > 0 ? irrf / 100 : undefined };
    if (withdrawal) update.mutate({ withdrawalId: withdrawal.id, body }, { onSuccess: onSaved });
    else create.mutate(body, { onSuccess: onSaved });
  }

  const deleteWith = (deletePersonal: boolean) =>
    remove.mutate({ withdrawalId: withdrawal!.id, deletePersonal }, { onSuccess: onDeleted });

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-4">
      {!withdrawal && allowProLabore && (
        <div role="group" aria-label="Tipo de retirada" className="grid grid-cols-2 gap-1 rounded-full bg-sunken p-1">
          {([["PRO_LABORE", "Pró-labore"], ["DISTRIBUICAO_LUCROS", "Lucros"]] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={kind === value} onClick={() => setKind(value)}
              className={`flex h-11 items-center justify-center rounded-full text-sm font-bold ${
                kind === value ? "bg-surface text-text shadow-clay-sm" : "text-text-muted"
              }`}>
              {label}
            </button>
          ))}
        </div>
      )}
      {partners.length > 1 && (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-text-muted">Sócio</span>
          <select value={partnerId} disabled={Boolean(withdrawal)} onChange={(e) => setPartnerId(Number(e.target.value))} className={field}>
            {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
          </select>
        </label>
      )}
      {proLabore && !withdrawal && (
        <div role="group" aria-label="Mês da folha" className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-text-muted">Mês da folha</span>
          <MonthSwitcher month={competence} onChange={setCompetence} />
        </div>
      )}
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-muted">Pago em</span>
        <input type="date" value={paymentDate} max={todayIso()} onChange={(e) => setPaymentDate(e.target.value)} className={field} />
      </label>
      {proLabore ? (
        <MoneyField label="Pró-labore bruto" cents={gross} onChange={setGross} error={fieldErrors.grossAmount}
          hint={informed ? undefined : "O INSS (11%) e o IRRF são calculados pelo app."} />
      ) : (
        <>
          <MoneyField label="Valor distribuído" cents={gross} onChange={setGross} error={fieldErrors.grossAmount}
            hint="Lucro não tem INSS e não conta na folha do Fator R." />
          <MoneyField label="IRRF retido (opcional)" cents={irrf} onChange={setIrrf}
            hint="Só se a empresa reteve IR na fonte (acima de R$ 50 mil no mês, pela Lei 15.270/2025)." />
        </>
      )}
      {informed && (
        <>
          <p className="text-sm text-text-soft">O app calcula impostos de 01/2026 em diante. Informe o INSS e o IRRF retidos, como estão no holerite.</p>
          <div className="grid grid-cols-2 gap-3">
            <MoneyField label="INSS retido" cents={inss} onChange={setInss} />
            <MoneyField label="IRRF retido" cents={irrf} onChange={setIrrf} />
          </div>
        </>
      )}
      {error && Object.keys(fieldErrors).length === 0 && (
        <p role="alert" className="text-sm font-semibold text-danger-strong">{error.message}</p>
      )}
      <button type="submit" disabled={gross <= 0 || !paymentDate || partnerId === undefined || mutation.isPending}
        className="h-14 rounded-full bg-accent font-bold text-on-accent shadow-clay-accent transition active:scale-95 disabled:opacity-60">
        <PendingLabel pending={mutation.isPending} pendingText="Salvando…">{withdrawal ? "Salvar" : "Registrar retirada"}</PendingLabel>
      </button>
      {withdrawal && (confirmingDelete ? (
        <div className="flex flex-col gap-2 rounded-2xl bg-sunken p-3">
          <p className="text-sm text-text-soft">
            {withdrawal.personalTransactionId !== undefined
              ? "Esta retirada está lançada nas suas finanças. Excluir também o lançamento?"
              : "Excluir esta retirada?"}
          </p>
          <div className="flex flex-wrap gap-2">
            {withdrawal.personalTransactionId !== undefined ? (
              <>
                <button type="button" disabled={remove.isPending} onClick={() => deleteWith(true)}
                  className="flex min-h-11 items-center px-2 text-sm font-bold text-danger-strong disabled:opacity-60">
                  Excluir as duas
                </button>
                <button type="button" disabled={remove.isPending} onClick={() => deleteWith(false)}
                  className="flex min-h-11 items-center px-2 text-sm font-bold text-danger-strong disabled:opacity-60">
                  Só a retirada
                </button>
              </>
            ) : (
              <button type="button" disabled={remove.isPending} onClick={() => deleteWith(false)}
                className="flex min-h-11 items-center px-2 text-sm font-bold text-danger-strong disabled:opacity-60">
                <PendingLabel pending={remove.isPending} pendingText="Excluindo…">Excluir</PendingLabel>
              </button>
            )}
            <button type="button" onClick={() => setConfirmingDelete(false)} className="flex min-h-11 items-center px-2 text-sm font-bold text-text-muted">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirmingDelete(true)} className="flex min-h-11 items-center self-start text-sm font-bold text-danger-strong">
          Excluir retirada
        </button>
      ))}
    </form>
  );
}
