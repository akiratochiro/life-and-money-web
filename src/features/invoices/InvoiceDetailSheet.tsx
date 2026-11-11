import { useState } from "react";
import {
  downloadInvoiceFile,
  useCorrectInvoice,
  useDeleteInvoice,
  useSetInvoiceStatus,
  type Invoice,
} from "./invoicesApi";
import { draftFrom, isDraftComplete, toData, WITHHOLDINGS } from "./invoiceDraft";
import { InvoiceFieldsForm } from "./InvoiceFieldsForm";
import { formatCnpj } from "../company/cnpj";
import { ApiError } from "../../shared/api/problem";
import { BottomSheet } from "../../shared/ui/BottomSheet";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { formatDate } from "../../shared/lib/dates";
import { formatCents, toCents } from "../../shared/lib/money";

const SOURCE = { XML: "Lida do XML", PDF: "Lida do PDF e conferida", MANUAL: "Preenchida à mão" } as const;

type Props = { companyId: number; invoice: Invoice; readOnly: boolean; onClose: () => void };

/** O detalhe de uma nota: os valores, baixar o original, mudar o status, corrigir (PDF e manual) e excluir. */
export function InvoiceDetailSheet({ companyId, invoice, readOnly, onClose }: Props) {
  const status = useSetInvoiceStatus(companyId);
  const remove = useDeleteInvoice(companyId);
  const correct = useCorrectInvoice(companyId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => draftFrom(invoice));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [downloadError, setDownloadError] = useState<string>();

  const cancelled = invoice.status === "CANCELADA";
  const withheld = WITHHOLDINGS.map(({ key, label }) => ({ label, cents: draftFrom(invoice)[key] })).filter((w) => w.cents > 0);
  const fieldErrors = correct.error instanceof ApiError ? correct.error.fieldErrors : {};

  return (
    <BottomSheet title={`Nota nº ${invoice.number}`} open onClose={onClose}>
      {editing ? (
        <div className="flex flex-col gap-4 pt-2">
          <InvoiceFieldsForm draft={draft} onChange={setDraft} errors={fieldErrors} />
          {correct.error && Object.keys(fieldErrors).length === 0 && (
            <p role="alert" className="text-sm font-semibold text-danger-strong">{correct.error.message}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!isDraftComplete(draft) || correct.isPending}
              onClick={() => correct.mutate({ invoiceId: invoice.id, data: toData(draft) }, { onSuccess: () => setEditing(false) })}
              className="h-12 flex-1 rounded-full bg-accent font-bold text-on-accent shadow-clay-accent disabled:opacity-60"
            >
              <PendingLabel pending={correct.isPending} pendingText="Salvando…">Salvar correção</PendingLabel>
            </button>
            <button type="button" onClick={() => setEditing(false)} className="h-12 flex-1 rounded-full bg-sunken font-bold">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pt-2">
          {cancelled && (
            <p role="note" className="rounded-2xl bg-warning-soft p-3 text-sm font-semibold text-warning-strong">
              Nota cancelada: não conta como receita.
            </p>
          )}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-text-muted">Competência</dt>
            <dd className="font-semibold">{formatDate(invoice.competenceDate)}</dd>
            <dt className="text-text-muted">Emissão</dt>
            <dd className="font-semibold">{formatDate(invoice.issueDate)}</dd>
            <dt className="text-text-muted">Serviço</dt>
            <dd className="font-semibold tabular-nums">{formatCents(toCents(invoice.serviceAmount))}</dd>
            {invoice.unconditionalDiscountAmount > 0 && (
              <>
                <dt className="text-text-muted">Desconto</dt>
                <dd className="font-semibold tabular-nums">{formatCents(toCents(invoice.unconditionalDiscountAmount))}</dd>
              </>
            )}
            {withheld.map((item) => (
              <div key={item.label} className="contents">
                <dt className="text-text-muted">{item.label}</dt>
                <dd className="font-semibold tabular-nums">{formatCents(item.cents)}</dd>
              </div>
            ))}
            <dt className="text-text-muted">Líquido</dt>
            <dd className="font-semibold tabular-nums">{formatCents(toCents(invoice.netAmount))}</dd>
            <dt className="text-text-muted">Tomador</dt>
            <dd className="font-semibold">
              {invoice.takerName ?? "Não informado"}
              {invoice.takerDocument && <span className="block text-xs text-text-muted">{formatCnpj(invoice.takerDocument)}</span>}
            </dd>
            {invoice.accessKey && (
              <>
                <dt className="text-text-muted">Chave</dt>
                <dd className="break-all font-mono text-xs">{invoice.accessKey}</dd>
              </>
            )}
            <dt className="text-text-muted">Origem</dt>
            <dd className="font-semibold">{SOURCE[invoice.source]}</dd>
          </dl>

          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => downloadInvoiceFile(companyId, invoice.id).catch((error: Error) => setDownloadError(error.message))}
              className="flex min-h-11 items-center self-start text-sm font-bold text-link"
            >
              Baixar o arquivo original
            </button>
            {downloadError && <p role="alert" className="text-sm font-semibold text-danger-strong">{downloadError}</p>}
            {!readOnly && (
              <>
                {invoice.source !== "XML" && (
                  <button type="button" onClick={() => setEditing(true)} className="flex min-h-11 items-center self-start text-sm font-bold text-link">
                    Corrigir os campos
                  </button>
                )}
                <button
                  type="button"
                  disabled={status.isPending}
                  onClick={() => status.mutate({ invoiceId: invoice.id, cancel: !cancelled })}
                  className="flex min-h-11 items-center self-start text-sm font-bold text-text-soft disabled:opacity-60"
                >
                  <PendingLabel pending={status.isPending} pendingText="Salvando…">
                    {cancelled ? "Reativar a nota" : "Marcar como cancelada"}
                  </PendingLabel>
                </button>
                {confirmingDelete ? (
                  <div className="flex flex-col gap-2 rounded-2xl bg-sunken p-3">
                    <p className="text-sm text-text-soft">Excluir a nota e o arquivo dela? Não dá para desfazer.</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(invoice.id, { onSuccess: onClose })}
                        className="flex min-h-11 items-center rounded-full px-4 text-sm font-bold text-danger-strong disabled:opacity-60"
                      >
                        <PendingLabel pending={remove.isPending} pendingText="Excluindo…">Excluir</PendingLabel>
                      </button>
                      <button type="button" onClick={() => setConfirmingDelete(false)} className="flex min-h-11 items-center rounded-full px-4 text-sm font-bold text-text-muted">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmingDelete(true)} className="flex min-h-11 items-center self-start text-sm font-bold text-danger-strong">
                    Excluir a nota
                  </button>
                )}
              </>
            )}
            {(status.error || remove.error) && (
              <p role="alert" className="text-sm font-semibold text-danger-strong">{(status.error ?? remove.error)!.message}</p>
            )}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
