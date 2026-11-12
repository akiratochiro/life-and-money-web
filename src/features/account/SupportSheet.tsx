import { useId, useState } from "react";
import { useContactSupport } from "./supportApi";
import { ApiError } from "../../shared/api/problem";
import { formatWait, useRetryCountdown } from "../../shared/api/useRetryCountdown";
import { BottomSheet } from "../../shared/ui/BottomSheet";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { TextField } from "../../shared/ui/TextField";

const MIN = 10;
const MAX = 3000;

/**
 * O formulário de suporte (decisão 35): assunto opcional e a mensagem. A resposta chega no e-mail da conta;
 * o endereço do suporte nunca aparece aqui.
 */
export function SupportSheet({ email, open, onClose }: { email?: string; open: boolean; onClose: () => void }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const contact = useContactSupport();
  const wait = useRetryCountdown(contact.error);
  const messageId = useId();
  const fieldErrors = contact.error instanceof ApiError ? contact.error.fieldErrors : {};
  const rateLimited = contact.error instanceof ApiError && contact.error.status === 429;
  const tooShort = message.trim().length < MIN;

  function close() {
    onClose();
    if (contact.isSuccess) {
      setSubject("");
      setMessage("");
      contact.reset();
    }
  }

  return (
    <BottomSheet title="Fale com o suporte" open={open} onClose={close}>
      {contact.isSuccess ? (
        <div role="status" className="flex flex-col gap-3">
          <p className="font-semibold">Mensagem enviada.</p>
          <p className="text-sm text-text-soft">
            A resposta chega no seu e-mail{email ? ` (${email})` : ""}. Se não aparecer em alguns dias, confira a caixa de spam.
          </p>
          <button type="button" onClick={close} className="h-11 self-start rounded-full bg-surface px-5 font-bold">Fechar</button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            contact.mutate({ subject: subject.trim() || undefined, message: message.trim() });
          }}
        >
          <p className="text-sm text-text-soft">
            Dúvida, problema ou sugestão? Escreva aqui. A resposta chega no e-mail da sua conta.
          </p>
          <TextField label="Assunto (opcional)" value={subject} maxLength={100} onChange={(e) => setSubject(e.target.value)}
            error={fieldErrors.subject} />
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-text-muted">Mensagem</span>
              <textarea
                value={message}
                maxLength={MAX}
                rows={6}
                onChange={(e) => setMessage(e.target.value)}
                aria-invalid={fieldErrors.message ? true : undefined}
                aria-describedby={messageId}
                className="rounded-2xl border border-line bg-sunken px-4 py-3 text-base text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 aria-invalid:border-danger"
              />
            </label>
            <span id={messageId} className={`text-sm ${fieldErrors.message ? "font-semibold text-danger-strong" : "text-text-muted"}`}>
              {fieldErrors.message ?? `${message.length} de ${MAX} caracteres; no mínimo ${MIN}.`}
            </span>
          </div>
          {contact.isError && !fieldErrors.message && !fieldErrors.subject && (
            <p role="alert" className="text-sm font-semibold text-danger-strong">
              {rateLimited && wait > 0 ? `Você já mandou várias mensagens. Tente de novo em ${formatWait(wait)}.` : contact.error.message}
            </p>
          )}
          <button type="submit" disabled={tooShort || contact.isPending || (rateLimited && wait > 0)}
            className="h-12 rounded-full bg-accent px-5 font-bold text-on-accent shadow-clay-accent disabled:opacity-60">
            <PendingLabel pending={contact.isPending} pendingText="Enviando…">Enviar mensagem</PendingLabel>
          </button>
        </form>
      )}
    </BottomSheet>
  );
}
