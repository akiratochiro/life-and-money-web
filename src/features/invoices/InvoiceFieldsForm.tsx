import { useId } from "react";
import { WITHHOLDINGS, type InvoiceDraft } from "./invoiceDraft";
import { MoneyField } from "../../shared/ui/MoneyField";
import { TextField } from "../../shared/ui/TextField";
import { todayIso } from "../../shared/lib/dates";

type Props = {
  draft: InvoiceDraft;
  onChange: (draft: InvoiceDraft) => void;
  errors?: Record<string, string>;
};

const dateClass =
  "h-14 rounded-2xl border border-line bg-sunken px-4 text-base text-text outline-none focus:border-accent aria-invalid:border-danger [color-scheme:light]";

/** Os campos de uma nota do PDF ou digitada. Os nomes dos erros são os da API (InvoiceData). */
export function InvoiceFieldsForm({ draft, onChange, errors = {} }: Props) {
  const set = <K extends keyof InvoiceDraft>(key: K, value: InvoiceDraft[K]) => onChange({ ...draft, [key]: value });
  const hasWithholding = WITHHOLDINGS.some(({ key }) => draft[key] > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Número da nota" required maxLength={20} value={draft.number}
          onChange={(e) => set("number", e.target.value)} error={errors.number} />
        <TextField label="Chave de acesso" inputMode="numeric" maxLength={70} value={draft.accessKey}
          onChange={(e) => set("accessKey", e.target.value)} hint="Opcional: os 50 dígitos."
          error={errors.accessKey} />
        <DateInput label="Data de emissão" value={draft.issueDate} onChange={(v) => set("issueDate", v)}
          error={errors.issueDate} />
        <DateInput label="Competência" value={draft.competenceDate} onChange={(v) => set("competenceDate", v)}
          error={errors.competenceDate} hint="É por ela que a receita conta." />
        <MoneyField label="Valor do serviço" cents={draft.serviceCents} onChange={(v) => set("serviceCents", v)}
          error={errors.serviceAmount} />
        <MoneyField label="Desconto incondicional" cents={draft.discountCents} onChange={(v) => set("discountCents", v)}
          error={errors.unconditionalDiscountAmount} hint="Não conta como receita." />
        <MoneyField label="Valor líquido" cents={draft.netCents} onChange={(v) => set("netCents", v)}
          error={errors.netAmount} />
      </div>

      <details open={hasWithholding} className="rounded-2xl bg-sunken/60 p-3">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-text-soft">
          Retenções (se houver)
        </summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {WITHHOLDINGS.map(({ key, label }) => (
            <MoneyField key={key} label={label} cents={draft[key]} onChange={(v) => set(key, v)} />
          ))}
        </div>
      </details>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Tomador (cliente)" maxLength={255} value={draft.takerName}
          onChange={(e) => set("takerName", e.target.value)} error={errors.takerName} />
        <TextField label="CNPJ ou CPF do tomador" maxLength={40} value={draft.takerDocument}
          onChange={(e) => set("takerDocument", e.target.value)} error={errors.takerDocument} />
      </div>
    </div>
  );
}

function DateInput({ label, value, onChange, error, hint }: {
  label: string; value: string; onChange: (value: string) => void; error?: string; hint?: string;
}) {
  const messageId = useId();
  const message = error ?? hint;
  return (
    <div className="flex flex-col gap-2">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-text-muted">{label}</span>
        <input type="date" required value={value} max={todayIso()} onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined} aria-describedby={message ? messageId : undefined}
          className={dateClass} />
      </label>
      {message && (
        <span id={messageId} className={error ? "text-sm font-semibold text-danger-strong" : "text-sm text-text-muted"}>
          {message}
        </span>
      )}
    </div>
  );
}
