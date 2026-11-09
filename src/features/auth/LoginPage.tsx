import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { login } from "./authApi";
import { ApiError } from "../../shared/api/problem";
import { formatWait, useRetryCountdown } from "../../shared/api/useRetryCountdown";
import { TextField } from "../../shared/ui/TextField";
import { Button } from "../../shared/ui/Button";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { Logo } from "../../shared/brand/Logo";
import { FloatingShapes } from "../../shared/brand/FloatingShapes";

export function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const from = (location.state as { from?: string } | null)?.from ?? "/";
  const expired = searchParams.get("expired") === "1";
  const accountDeleted = (location.state as { accountDeleted?: boolean } | null)?.accountDeleted === true;

  const mutation = useMutation({
    mutationFn: login,
    // Entrar com outra conta sem ter saído não encerra a sessão anterior, então o cache dela
    // também precisa ir embora aqui.
    onSuccess: () => {
      queryClient.clear();
      navigate(from, { replace: true });
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ email, password });
  }

  const wait = useRetryCountdown(mutation.error);
  const rateLimited = mutation.error instanceof ApiError && mutation.error.status === 429;

  const errorMessage =
    mutation.error instanceof ApiError && mutation.error.status === 401
      ? "E-mail ou senha incorretos."
      : rateLimited
        ? undefined
        : mutation.error?.message;

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-canvas px-5 py-10">
      <FloatingShapes variant="login" />
      <div className="relative w-full max-w-sm">
        <Logo />
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight">
          Que bom te ver de novo.
        </h1>

        {accountDeleted && (
          <p role="status" className="mt-6 rounded-2xl bg-sunken p-4 text-sm text-text-soft">
            Sua conta foi excluída, com todos os dados dela.
          </p>
        )}

        {expired && (
          <p role="status" className="mt-6 rounded-2xl bg-sunken p-4 text-sm text-text-soft">
            Sua sessão expirou. Entre de novo para continuar.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5 rounded-hero bg-surface p-6 shadow-card">
          <TextField
            label="E-mail"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Senha"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Link to="/forgot-password" className="-my-2 flex min-h-11 items-center self-end text-sm font-bold text-link">
            Esqueci minha senha
          </Link>

          {errorMessage && (
            <p role="alert" className="text-sm font-semibold text-danger-strong">
              {errorMessage}
            </p>
          )}
          {wait > 0 && (
            <p role="alert" className="text-sm font-semibold text-danger-strong">
              Muitas tentativas. Tente de novo em {formatWait(wait)}.
            </p>
          )}

          <Button type="submit" disabled={mutation.isPending || wait > 0}>
            <PendingLabel pending={mutation.isPending} pendingText="Entrando…">Entrar</PendingLabel>
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Ainda não tem conta?{" "}
          <Link to="/register" className="font-bold text-link">
            Criar conta
          </Link>
        </p>
        <Link to="/privacy" className="mx-auto mt-2 flex min-h-11 w-fit items-center text-sm font-semibold text-text-muted underline">
          Privacidade
        </Link>
      </div>
    </main>
  );
}