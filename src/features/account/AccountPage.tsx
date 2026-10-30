import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DELETE_CONFIRMATION, deleteAccount, downloadAccountExport } from "./accountApi";
import { useMe } from "../home/homeApi";
import { useLogout } from "../auth/useLogout";
import { endSession } from "../../shared/auth/session";
import { ApiError } from "../../shared/api/problem";
import { formatWait, useRetryCountdown } from "../../shared/api/useRetryCountdown";
import { Card } from "../../shared/ui/Card";
import { TextField } from "../../shared/ui/TextField";

export function AccountPage() {
  const me = useMe();
  const logout = useLogout();
  const exportData = useMutation({ mutationFn: () => downloadAccountExport() });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Minha conta</h1>
      </header>

      <Card className="flex flex-col gap-1">
        {me.data ? (
          <>
            <p className="font-display text-lg font-semibold">{me.data.name}</p>
            <p className="text-sm text-text-soft">{me.data.email}</p>
            <p className="mt-2 text-xs text-text-muted">
              Conta criada em{" "}
              {new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(
                new Date(me.data.createdAt),
              )}
            </p>
          </>
        ) : (
          <div className="h-16 animate-pulse rounded-2xl bg-ink-800" />
        )}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-base font-semibold">Seus dados</h2>
        <p className="text-sm leading-relaxed text-text-soft">
          Baixe um arquivo JSON com tudo o que está na sua conta: categorias, transações, orçamento e metas.
        </p>
        <button
          type="button"
          onClick={() => exportData.mutate()}
          disabled={exportData.isPending}
          className="self-start text-sm font-bold text-signal disabled:opacity-60"
        >
          {exportData.isPending ? "Preparando o arquivo..." : "Exportar meus dados"}
        </button>
        {exportData.error && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {exportData.error.message}
          </p>
        )}
      </Card>

      <Card>
        <button type="button" onClick={logout} className="text-sm font-bold text-text">
          Sair da conta
        </button>
      </Card>

      <DeleteAccountSection />
    </div>
  );
}

function DeleteAccountSection() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: (value: string) => deleteAccount(value),
    onSuccess: () => {
      // A API já apagou a sessão e o cookie; aqui só some o que ficou na memória da aba.
      queryClient.clear();
      endSession({ expired: false });
      navigate("/login", { replace: true, state: { accountDeleted: true } });
    },
  });

  const wait = useRetryCountdown(mutation.error);
  const apiError = mutation.error instanceof ApiError ? mutation.error : undefined;
  const passwordError = apiError?.fieldErrors.password;
  const otherError = apiError && !passwordError && apiError.status !== 429 ? apiError.message : undefined;
  const confirmed = confirmation === DELETE_CONFIRMATION && password.length > 0;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (confirmed) {
      mutation.mutate(password);
    }
  }

  if (!open) {
    return (
      <Card className="flex flex-col gap-3">
        <h2 className="font-display text-base font-semibold">Excluir conta</h2>
        <p className="text-sm leading-relaxed text-text-soft">
          Apaga a conta e todos os dados dela. Não dá para desfazer.
        </p>
        <button type="button" onClick={() => setOpen(true)} className="self-start text-sm font-bold text-danger">
          Quero excluir minha conta
        </button>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-base font-semibold text-danger">Excluir conta</h2>
          <p className="text-sm leading-relaxed text-text-soft">
            Isso apaga para sempre suas categorias, transações, orçamento e metas. Se quiser guardar uma
            cópia, exporte seus dados antes.
          </p>
        </div>

        <TextField
          label={`Digite ${DELETE_CONFIRMATION} para confirmar`}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
        <TextField
          label="Sua senha"
          type="password"
          autoComplete="current-password"
          value={password}
          error={passwordError}
          onChange={(e) => setPassword(e.target.value)}
        />

        {wait > 0 && (
          <p role="alert" className="text-sm font-semibold text-danger">
            Muitas tentativas. Tente de novo em {formatWait(wait)}.
          </p>
        )}
        {otherError && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {otherError}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={!confirmed || mutation.isPending || wait > 0}
            className="h-14 rounded-full bg-danger px-6 font-bold text-ink-900 transition active:scale-95 disabled:opacity-40"
          >
            {mutation.isPending ? "Excluindo..." : "Excluir minha conta"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-14 rounded-full px-6 font-bold text-text-muted"
          >
            Cancelar
          </button>
        </div>
      </form>
    </Card>
  );
}
