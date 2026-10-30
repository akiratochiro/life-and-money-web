import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { requestPasswordReset } from "./authApi";
import { ApiError } from "../../shared/api/problem";
import { formatWait, useRetryCountdown } from "../../shared/api/useRetryCountdown";
import { TextField } from "../../shared/ui/TextField";
import { Button } from "../../shared/ui/Button";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const mutation = useMutation({ mutationFn: (value: string) => requestPasswordReset(value) });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate(email);
  }

  const fieldError = mutation.error instanceof ApiError ? mutation.error.fieldErrors.email : undefined;
  const wait = useRetryCountdown(mutation.error);
  const rateLimited = mutation.error instanceof ApiError && mutation.error.status === 429;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink-900 px-5 py-10">
      <div className="w-full max-w-sm">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-signal">
          Life and Money
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight">Esqueceu a senha?</h1>

        {mutation.isSuccess ? (
          <div role="status" className="mt-8 flex flex-col gap-3 rounded-hero bg-surface p-6 shadow-card">
            {/* A mensagem vem da API e é a mesma exista ou não a conta. */}
            <p className="text-base leading-relaxed">{mutation.data}</p>
            <p className="text-sm leading-relaxed text-text-soft">
              Não chegou? Confira a caixa de spam: o e-mail sai de um remetente que seu provedor
              pode não conhecer.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm leading-relaxed text-text-soft">
              Informe o e-mail da sua conta e enviaremos um link para você criar uma senha nova.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5 rounded-hero bg-surface p-6 shadow-card">
              <TextField
                label="E-mail"
                type="email"
                autoComplete="email"
                required
                value={email}
                error={fieldError}
                onChange={(e) => setEmail(e.target.value)}
              />

              {mutation.error && !fieldError && !rateLimited && (
                <p role="alert" className="text-sm font-semibold text-danger">
                  {mutation.error.message}
                </p>
              )}
              {wait > 0 && (
                <p role="alert" className="text-sm font-semibold text-danger">
                  Muitas tentativas. Tente de novo em {formatWait(wait)}.
                </p>
              )}

              <Button type="submit" disabled={mutation.isPending || wait > 0}>
                {mutation.isPending ? "Enviando..." : "Enviar link"}
              </Button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-text-muted">
          Lembrou?{" "}
          <Link to="/login" className="font-bold text-signal">
            Voltar para o login
          </Link>
        </p>
      </div>
    </main>
  );
}
