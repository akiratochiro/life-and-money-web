import { useRef, useState, type DragEvent } from "react";
import { usePreviewInvoices, useSaveInvoice, type InvoicePreview } from "./invoicesApi";
import { Badge } from "../../shared/ui/Badge";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { formatDate } from "../../shared/lib/dates";
import { formatCents, toCents } from "../../shared/lib/money";

type Item = { file: File; preview: InvoicePreview; saved?: string; error?: Error };

const ACCEPT = ".xml,application/xml,text/xml";

/**
 * Envio em duas etapas (decisão 25): escolher os arquivos gera uma pré-visualização, que não grava
 * nada, e cada nota é salva depois de conferida. Só o XML entra, por enquanto: um PDF aparece
 * recusado, com a orientação de baixar o XML. No celular não existe arrastar e soltar, então o botão
 * é o caminho principal.
 */
export function InvoiceUpload({ companyId }: { companyId: number }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = usePreviewInvoices(companyId);
  const save = useSaveInvoice(companyId);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [savingAll, setSavingAll] = useState(false);

  function choose(files: File[]) {
    if (files.length === 0) return;
    preview.mutate(files, {
      // A API responde na ordem dos arquivos; o filtro garante que nenhum card fique sem o arquivo dele.
      onSuccess: (previews) =>
        setItems(previews.flatMap((result, index) => (files[index] ? [{ file: files[index], preview: result }] : []))),
    });
  }

  function update(index: number, change: Partial<Item>) {
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...change } : item)));
  }

  async function saveItem(index: number, item: Item) {
    try {
      const created = await save.mutateAsync(item.file);
      update(index, { saved: `Nota nº ${created.number} salva.`, error: undefined });
    } catch (error) {
      update(index, { error: error as Error });
    }
  }

  /** Uma de cada vez: duas notas chegando juntas poderiam passar juntas pela conferência da cota. */
  async function saveAllReady() {
    setSavingAll(true);
    for (const [index, item] of items.entries()) {
      if (item.preview.status === "READY" && !item.saved) await saveItem(index, item);
    }
    setSavingAll(false);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    choose([...event.dataTransfer.files]);
  }

  const readyCount = items.filter((item) => item.preview.status === "READY" && !item.saved).length;

  return (
    <section aria-labelledby="upload-title" className="flex flex-col gap-4">
      <h2 id="upload-title" className="sr-only">Enviar notas</h2>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center gap-3 rounded-card border-2 border-dashed p-6 text-center transition ${
          dragging ? "border-accent bg-accent/5" : "border-line bg-surface/60"
        }`}
      >
        <p className="text-sm text-text-soft">
          Envie o XML das notas, baixado no portal da NFS-e. Até 10 arquivos de 2 MB por vez.
          <span className="hidden md:inline"> Pode arrastar os arquivos para cá.</span>
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={preview.isPending}
          className="h-12 rounded-full bg-accent px-6 font-bold text-on-accent shadow-clay-accent transition active:scale-95 disabled:opacity-60"
        >
          <PendingLabel pending={preview.isPending} pendingText="Lendo arquivos…">Escolher arquivos</PendingLabel>
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          aria-label="Arquivos XML das notas"
          onChange={(event) => {
            choose([...(event.target.files ?? [])]);
            event.target.value = "";
          }}
        />
        {preview.error && (
          <p role="alert" className="text-sm font-semibold text-danger-strong">
            {preview.error.message}
          </p>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex flex-col gap-3">
          {readyCount > 1 && (
            <button
              type="button"
              disabled={savingAll}
              onClick={saveAllReady}
              className="flex min-h-11 items-center self-start text-sm font-bold text-link disabled:opacity-60"
            >
              <PendingLabel pending={savingAll} pendingText="Salvando…">{`Salvar as ${readyCount} notas prontas`}</PendingLabel>
            </button>
          )}
          {items.map((item, index) => (
            <PreviewCard
              key={`${item.file.name}-${index}`}
              item={item}
              saving={save.isPending && save.variables === item.file}
              onSave={() => saveItem(index, item)}
              onDiscard={() => setItems((current) => current.filter((_, i) => i !== index))}
            />
          ))}
        </div>
      )}
    </section>
  );
}

const STATUS: Record<InvoicePreview["status"], { tone: "income" | "warning" | "danger"; label: string }> = {
  READY: { tone: "income", label: "Pronta" },
  DUPLICATE: { tone: "warning", label: "Repetida" },
  REJECTED: { tone: "danger", label: "Recusada" },
};

function PreviewCard({ item, saving, onSave, onDiscard }: {
  item: Item;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const { preview } = item;

  return (
    <article aria-label={preview.filename} className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card">
      <header className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-bold">{preview.filename}</span>
        {item.saved ? <Badge tone="income">Salva</Badge> : <Badge tone={STATUS[preview.status].tone}>{STATUS[preview.status].label}</Badge>}
      </header>

      {item.saved ? (
        <p role="status" className="text-sm font-semibold text-income-strong">{item.saved}</p>
      ) : (
        <>
          {preview.message && <p className="text-sm font-semibold text-danger-strong">{preview.message}</p>}
          {preview.warnings.map((warning) => (
            <p key={warning} role="note" className="rounded-2xl bg-warning-soft p-3 text-sm font-semibold text-warning-strong">
              {warning}
            </p>
          ))}

          {preview.status === "READY" && preview.fields && (
            <>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-text-muted">Número</dt>
                <dd className="font-semibold">{preview.fields.number}</dd>
                <dt className="text-text-muted">Competência</dt>
                <dd className="font-semibold">{formatDate(preview.fields.competenceDate)}</dd>
                <dt className="text-text-muted">Serviço</dt>
                <dd className="font-semibold tabular-nums">{formatCents(toCents(preview.fields.serviceAmount))}</dd>
                <dt className="text-text-muted">Líquido</dt>
                <dd className="font-semibold tabular-nums">{formatCents(toCents(preview.fields.netAmount))}</dd>
                {preview.fields.takerName && (
                  <>
                    <dt className="text-text-muted">Tomador</dt>
                    <dd className="font-semibold">{preview.fields.takerName}</dd>
                  </>
                )}
              </dl>
              <p className="text-xs text-text-muted">Os valores vêm do XML assinado e não podem ser alterados.</p>
            </>
          )}

          {item.error && <p role="alert" className="text-sm font-semibold text-danger-strong">{item.error.message}</p>}

          <div className="flex gap-2">
            {preview.status === "READY" && (
              <button
                type="button"
                disabled={saving}
                onClick={onSave}
                className="h-12 flex-1 rounded-full bg-accent font-bold text-on-accent shadow-clay-accent transition active:scale-95 disabled:opacity-60"
              >
                <PendingLabel pending={saving} pendingText="Salvando…">Salvar nota</PendingLabel>
              </button>
            )}
            <button type="button" onClick={onDiscard} className="h-12 flex-1 rounded-full bg-sunken font-bold text-text transition active:scale-95">
              Descartar
            </button>
          </div>
        </>
      )}
    </article>
  );
}
