import { useId, useState, type FormEvent, type ReactNode } from "react";
import {
  useCnpjLookup,
  type CnpjLookup,
  type Company,
  type CompanyUpdate,
  type NewCompany,
} from "./companyApi";
import {
  ANNEX_IV_NOTICE,
  ANNEX_OPTIONS,
  EMPTY_SELECTION,
  FATOR_R_HELP,
  LEGAL_NATURES,
  MANUAL_TAXES_NOTICE,
  MEI_ACTIVITIES,
  TAX_REGIME_LABEL,
  hasAutomaticTaxes,
  isComplete,
  needsActivity,
  needsAnnex,
  regimesFor,
  toPayload,
  withNature,
  withRegime,
  type RegimeSelection,
} from "./regimeOptions";
import { cleanCnpj, formatCnpj, isCompleteCnpj } from "./cnpj";
import { EmojiPicker } from "./EmojiPicker";
import { ApiError } from "../../shared/api/problem";
import { TextField } from "../../shared/ui/TextField";
import { AmountInput } from "../../shared/ui/AmountInput";
import { PercentInput } from "../../shared/ui/PercentInput";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { todayIso } from "../../shared/lib/dates";
import { toCents } from "../../shared/lib/money";

export const OPENING_DATE_RULE =
  "Você pode corrigir a data de abertura enquanto a empresa não tiver mudança de enquadramento nem " +
  "notas fiscais. Depois disso ela fica fixa, porque o histórico de impostos parte dela.";

export const OPENING_DATE_LOCKED =
  "A data de abertura não pode mais ser alterada: a empresa já tem mudança de enquadramento ou notas fiscais.";

const inputClass =
  "h-14 rounded-2xl border border-line bg-sunken px-4 text-base text-text outline-none focus:border-accent aria-invalid:border-danger disabled:opacity-60 [color-scheme:light]";

type CreateProps = {
  mode: "create";
  pending: boolean;
  error: Error | null;
  onSubmit: (company: NewCompany) => void;
};

type EditProps = {
  mode: "edit";
  company: Company;
  pending: boolean;
  error: Error | null;
  onSubmit: (changes: CompanyUpdate) => void;
  footer?: ReactNode;
};

/**
 * Cadastrar e editar dividem o formulário, mas não o enquadramento: ele tem histórico, e mudar é
 * abrir uma vigência nova (em outra folha), não editar o que já valeu.
 */
export function CompanyForm(props: CreateProps | EditProps) {
  const editing = props.mode === "edit";
  const company = editing ? props.company : undefined;

  const [emoji, setEmoji] = useState(company?.emoji ?? "💼");
  const [name, setName] = useState(company?.name ?? "");
  const [cnpj, setCnpj] = useState(company?.cnpj ? formatCnpj(company.cnpj) : "");
  const [openingDate, setOpeningDate] = useState(company?.openingDate ?? "");
  const [selection, setSelection] = useState<RegimeSelection>(EMPTY_SELECTION);
  const [partnerName, setPartnerName] = useState("");
  const [balanceCents, setBalanceCents] = useState(company ? Math.abs(toCents(company.openingBalance)) : 0);
  const [negative, setNegative] = useState(company ? company.openingBalance < 0 : false);
  const [balanceDate, setBalanceDate] = useState(company?.openingBalanceDate ?? todayIso());
  const [targetBasisPoints, setTargetBasisPoints] = useState(company ? Math.round(company.fatorRTarget * 10_000) : 2_800);

  const lookup = useCnpjLookup();
  const fieldErrors = props.error instanceof ApiError ? props.error.fieldErrors : {};
  const openingDateLocked = editing && !company!.openingDateEditable;

  /** Só preenche o que está em branco: o que o usuário já digitou vale mais que a consulta. */
  function applyLookup(result: CnpjLookup) {
    if (!result.found) return;
    if (!name.trim() && (result.tradeName || result.name)) setName((result.tradeName ?? result.name)!);
    if (!openingDate && result.openingDate) setOpeningDate(result.openingDate);
    if (!editing && selection.legalNature === null && result.legalNature) {
      setSelection((current) => withNature(current, result.legalNature!));
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const openingBalance = ((negative ? -1 : 1) * balanceCents) / 100;
    if (props.mode === "create") {
      props.onSubmit({
        name: name.trim(),
        emoji,
        cnpj: cnpj.trim() ? cleanCnpj(cnpj) : undefined,
        openingDate,
        ...toPayload(selection),
        openingBalance,
        openingBalanceDate: balanceDate,
        partnerName: partnerName.trim() || undefined,
      });
      return;
    }
    props.onSubmit({
      name: name.trim(),
      emoji,
      // Vazio remove o CNPJ; a API distingue de "não mexer" pela ausência do campo.
      cnpj: cnpj.trim() ? cleanCnpj(cnpj) : "",
      openingDate: openingDateLocked ? undefined : openingDate,
      fatorRTarget: targetBasisPoints / 10_000,
      openingBalance,
      openingBalanceDate: balanceDate,
    });
  }

  const canSubmit =
    name.trim() !== "" &&
    emoji !== "" &&
    openingDate !== "" &&
    (editing || isComplete(selection)) &&
    (!editing || targetBasisPoints > 0) &&
    !props.pending;
  const shownErrors = Object.keys(fieldErrors).length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 pt-2">
      <EmojiPicker value={emoji} onChange={setEmoji} error={fieldErrors.emoji} />

      <TextField
        label="Nome da empresa"
        required
        maxLength={100}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ex.: Ana Design"
        error={fieldErrors.name}
      />

      <div className="flex flex-col gap-2">
        <TextField
          label="CNPJ"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={18}
          value={cnpj}
          onChange={(e) => {
            setCnpj(e.target.value);
            lookup.reset();
          }}
          onBlur={() => setCnpj((value) => formatCnpj(value))}
          hint="Opcional. Aceita também o CNPJ novo, com letras."
          error={fieldErrors.cnpj ?? lookupError(lookup.error)}
        />
        <button
          type="button"
          disabled={!isCompleteCnpj(cnpj) || lookup.isPending}
          onClick={() => lookup.mutate(cleanCnpj(cnpj), { onSuccess: applyLookup })}
          className="-my-1 flex min-h-11 items-center self-start text-sm font-bold text-link disabled:opacity-50"
        >
          <PendingLabel pending={lookup.isPending} pendingText="Consultando…">Buscar dados pelo CNPJ</PendingLabel>
        </button>
        {lookup.data && (
          <p role="status" className="text-sm text-text-soft">
            {lookupMessage(lookup.data)}
          </p>
        )}
      </div>

      <DateField
        label="Data de abertura"
        value={openingDate}
        onChange={setOpeningDate}
        max={todayIso()}
        disabled={openingDateLocked}
        error={fieldErrors.openingDate}
        hint={openingDateLocked ? OPENING_DATE_LOCKED : OPENING_DATE_RULE}
      />

      {!editing && <RegimeFields selection={selection} onChange={setSelection} errors={fieldErrors} />}

      {!editing && (
        <TextField
          label="Seu nome como sócio"
          maxLength={100}
          value={partnerName}
          onChange={(e) => setPartnerName(e.target.value)}
          hint="Se deixar em branco, usamos o nome da sua conta."
          error={fieldErrors.partnerName}
        />
      )}

      <fieldset className="flex flex-col gap-4 rounded-2xl bg-sunken p-4">
        <legend className="sr-only">Saldo inicial da conta PJ</legend>
        <AmountInput label="Saldo inicial da conta PJ" cents={balanceCents} onChange={setBalanceCents} />
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-text-soft">
          <input
            type="checkbox"
            checked={negative}
            onChange={(e) => setNegative(e.target.checked)}
            className="h-5 w-5 accent-accent"
          />
          A conta estava no vermelho
        </label>
        <DateField
          label="Data do saldo"
          value={balanceDate}
          onChange={setBalanceDate}
          max={todayIso()}
          error={fieldErrors.openingBalanceDate}
          hint="O saldo da empresa é calculado a partir deste dia."
        />
      </fieldset>

      {editing && (
        <div className="flex flex-col gap-2">
          <PercentInput label="Meta do Fator R" basisPoints={targetBasisPoints} onChange={setTargetBasisPoints} />
          <p className="text-center text-sm text-text-muted">
            Usada só nos alertas: o Anexo é decidido pelo limite da lei, que é 28%.
          </p>
          {fieldErrors.fatorRTarget && (
            <p className="text-center text-sm font-semibold text-danger-strong">{fieldErrors.fatorRTarget}</p>
          )}
        </div>
      )}

      {props.error && !shownErrors && (
        <p role="alert" className="text-sm font-semibold text-danger-strong">
          {props.error.message}
        </p>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="h-14 rounded-full bg-accent font-bold text-on-accent shadow-clay-accent transition active:scale-95 disabled:opacity-60"
      >
        <PendingLabel pending={props.pending} pendingText="Salvando…">
          {editing ? "Salvar" : "Cadastrar empresa"}
        </PendingLabel>
      </button>
      {editing && props.footer}
    </form>
  );
}

function lookupMessage(result: CnpjLookup): string {
  if (!result.available) return "A consulta de CNPJ está fora do ar agora. Preencha os dados à mão.";
  if (!result.found) {
    return "Não encontramos esse CNPJ na consulta pública. CNPJs com letras podem ainda não aparecer nela. Preencha os dados à mão.";
  }
  return "Preenchemos o que estava em branco com os dados públicos da Receita. Confira antes de salvar.";
}

/** O 429 (muitas consultas) e o CNPJ inválido vêm da API; o resto da consulta nunca é erro. */
function lookupError(error: Error | null): string | undefined {
  if (!(error instanceof ApiError)) return undefined;
  return error.fieldErrors.cnpj ?? error.message;
}

export function RegimeFields({
  selection,
  onChange,
  errors,
}: {
  selection: RegimeSelection;
  onChange: (selection: RegimeSelection) => void;
  errors: Record<string, string>;
}) {
  const regimes = regimesFor(selection.legalNature);

  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="sr-only">Enquadramento</legend>
      <SelectField
        label="Natureza jurídica"
        value={selection.legalNature ?? ""}
        onChange={(value) => onChange(withNature(selection, value as RegimeSelection["legalNature"] & string))}
        error={errors.legalNature}
        options={LEGAL_NATURES}
      />
      <SelectField
        label="Regime tributário"
        value={selection.taxRegime ?? ""}
        onChange={(value) => onChange(withRegime(selection, value as RegimeSelection["taxRegime"] & string))}
        disabled={regimes.length <= 1}
        error={errors.taxRegime}
        hint={selection.legalNature === "MEI" ? "O MEI é sempre tributado pelo SIMEI." : undefined}
        options={regimes.map((value) => ({ value, label: TAX_REGIME_LABEL[value] }))}
      />
      {needsActivity(selection.legalNature) && (
        <SelectField
          label="Atividade do MEI"
          value={selection.meiActivity ?? ""}
          onChange={(value) => onChange({ ...selection, meiActivity: value as RegimeSelection["meiActivity"] })}
          error={errors.meiActivity}
          hint="Define o valor do DAS-MEI."
          options={MEI_ACTIVITIES}
        />
      )}
      {needsAnnex(selection.taxRegime) && (
        <div className="flex flex-col gap-2">
          <SelectField
            label="Como o Anexo é definido"
            value={selection.annexConfig ?? ""}
            onChange={(value) => onChange({ ...selection, annexConfig: value as RegimeSelection["annexConfig"] })}
            error={errors.annexConfig}
            options={ANNEX_OPTIONS}
          />
          <p className="text-sm leading-relaxed text-text-muted">{FATOR_R_HELP}</p>
          <p className="text-sm leading-relaxed text-text-muted">{ANNEX_IV_NOTICE}</p>
        </div>
      )}
      {selection.taxRegime !== null && !hasAutomaticTaxes(selection.taxRegime) && (
        <p role="note" className="rounded-2xl bg-warning-soft p-3 text-sm font-semibold text-warning-strong">
          {MANUAL_TAXES_NOTICE}
        </p>
      )}
    </fieldset>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  error,
  hint,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const messageId = useId();
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-muted">{label}</span>
        <select
          value={value}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          {value === "" && <option value="">Escolha</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  );
}

export function DateField({
  label,
  value,
  onChange,
  max,
  error,
  hint,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
}) {
  const messageId = useId();
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-muted">{label}</span>
        <input
          type="date"
          required
          value={value}
          max={max}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || hint ? messageId : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      </label>
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  );
}

/** Fora do <label>, como no TextField: dentro dele, a mensagem entraria no nome do campo. */
function FieldMessage({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error) {
    return (
      <span id={id} className="text-sm font-semibold text-danger-strong">
        {error}
      </span>
    );
  }
  return hint ? (
    <span id={id} className="text-sm leading-relaxed text-text-muted">
      {hint}
    </span>
  ) : null;
}
