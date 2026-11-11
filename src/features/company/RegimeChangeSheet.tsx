import { useState, type FormEvent } from "react";
import { useChangeRegime, type CompanyRegime } from "./companyApi";
import { RegimeFields } from "./CompanyForm";
import { isComplete, toPayload, type RegimeSelection } from "./regimeOptions";
import { BottomSheet } from "../../shared/ui/BottomSheet";
import { Button } from "../../shared/ui/Button";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { ApiError } from "../../shared/api/problem";
import { addMonths, currentMonth } from "../../shared/lib/dates";

type Props = { companyId: number; latest: CompanyRegime; open: boolean; onClose: () => void };

/**
 * Mudar o enquadramento é abrir uma vigência nova, nunca editar a atual. O formulário começa com
 * o enquadramento mais recente, para o usuário mudar só o que mudou.
 */
export function RegimeChangeSheet({ companyId, latest, open, onClose }: Props) {
  const change = useChangeRegime(companyId);
  const [validFrom, setValidFrom] = useState(() => laterOf(currentMonth(), addMonths(latest.validFrom, 1)));
  const [selection, setSelection] = useState<RegimeSelection>({
    legalNature: latest.legalNature,
    taxRegime: latest.taxRegime,
    annexConfig: latest.annexConfig ?? null,
    meiActivity: latest.meiActivity ?? null,
  });

  function close() {
    change.reset();
    onClose();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    change.mutate({ validFrom, ...toPayload(selection) }, { onSuccess: close });
  }

  const fieldErrors = change.error instanceof ApiError ? change.error.fieldErrors : {};
  const generalError = change.error && Object.keys(fieldErrors).length === 0 ? change.error.message : undefined;

  return (
    <BottomSheet title="Mudar enquadramento" open={open} onClose={close}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-2">
        <p className="text-sm leading-relaxed text-text-soft">
          Os meses anteriores continuam com o enquadramento da época. O mês pode ser no passado, para registrar o
          histórico, ou no futuro, para agendar uma mudança.
        </p>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-text-muted">A partir de</span>
          <input
            type="month"
            required
            value={validFrom}
            min={addMonths(latest.validFrom, 1)}
            onChange={(e) => setValidFrom(e.target.value)}
            className="h-14 rounded-2xl border border-line bg-sunken px-4 text-base text-text outline-none focus:border-accent [color-scheme:light]"
          />
          {fieldErrors.validFrom && (
            <span className="text-sm font-semibold text-danger-strong">{fieldErrors.validFrom}</span>
          )}
        </label>
        <RegimeFields selection={selection} onChange={setSelection} errors={fieldErrors} />
        {generalError && (
          <p role="alert" className="text-sm font-semibold text-danger-strong">
            {generalError}
          </p>
        )}
        <Button type="submit" disabled={!validFrom || !isComplete(selection) || change.isPending}>
          <PendingLabel pending={change.isPending} pendingText="Salvando…">Salvar mudança</PendingLabel>
        </Button>
      </form>
    </BottomSheet>
  );
}

/** "AAAA-MM" se compara como texto. */
function laterOf(a: string, b: string): string {
  return a > b ? a : b;
}
