import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { register } from "./authApi";
import { ApiError } from "../../shared/api/problem";
import { formatWait, useRetryCountdown } from "../../shared/api/useRetryCountdown";
import { TextField } from "../../shared/ui/TextField";
import { Button } from "../../shared/ui/Button";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { Logo } from "../../shared/brand/Logo";
import { SpamNotice } from "./SpamNotice";

export function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // O cadastro não abre sessão: a conta só existe depois do link do e-mail (ConfirmEmailPage).
  const mutation = useMutation({ mutationFn: register });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ name, email, password });
  }

  const apiError = mutation.error instanceof ApiError ? mutation.error : null;
  const fieldErrors = apiError?.status === 400 ? apiError.fieldErrors : {};
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  const wait = useRetryCountdown(mutation.error);

  let formError: string | undefined;
  if (apiError?.status === 429) {
    formError = wait > 0 ? `Muitas tentativas. Tente de novo em ${formatWait(wait)}.` : undefined;
  } else if (!hasFieldErrors) {
    formError = mutation.error?.message;
  }

  if (mutation.isSuccess) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas px-5 py-10">
        <div className="w-full max-w-sm">
          <Logo />
          <h1 className="mt-3 font-display text-3xl font-semibold leading-tight">Confira seu e-mail.</h1>
          <p role="status" className="mt-3 text-sm leading-relaxed text-text-soft">
            {mutation.data} O e-mail vai para <strong className="text-text">{email}</strong>.
          </p>
          <div className="mt-5">
            <SpamNotice />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-text-muted">
            Se o endereço estava errado, é só fazer o cadastro de novo.
          </p>
          <Link
            to="/login"
            className="mt-8 flex h-14 items-center justify-center rounded-full bg-surface px-6 font-bold text-text shadow-clay-sm"
          >
            Ir para o login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-5 py-10">
      <div className="w-full max-w-sm">
        <Logo />
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight">
          Vamos colocar seu dinheiro em ordem.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          Leva menos de um minuto. Depois é só lançar o que entra e o que sai.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5 rounded-hero bg-surface p-6 shadow-card">
          <TextField
            label="Nome"
            autoComplete="name"
            required
            maxLength={255}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldErrors.name}
          />
          <TextField
            label="E-mail"
            type="email"
            autoComplete="email"
            required
            maxLength={255}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
          />
          <TextField
            label="Senha"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            hint="Mínimo de 8 caracteres."
          />

          {formError && (
            <p role="alert" className="text-sm font-semibold text-danger-strong">
              {formError}
            </p>
          )}

          <Button type="submit" disabled={mutation.isPending || wait > 0}>
            <PendingLabel pending={mutation.isPending} pendingText="Criando sua conta…">Criar conta</PendingLabel>
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Já tem conta?{" "}
          <Link to="/login" className="font-bold text-link">
            Entrar
          </Link>
        </p>
        <Link to="/privacy" className="mx-auto mt-2 flex min-h-11 w-fit items-center text-sm font-semibold text-text-muted underline">
          Como seus dados são tratados
        </Link>
      </div>
    </main>
  );
}