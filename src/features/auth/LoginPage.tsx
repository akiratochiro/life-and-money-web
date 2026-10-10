import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { login } from "./authApi";
import { ApiError } from "../../shared/api/problem";
import { TextField } from "../../shared/ui/TextField";
import { Button } from "../../shared/ui/Button";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const from = (location.state as { from?: string } | null)?.from ?? "/";
  const expired = searchParams.get("expired") === "1";

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: () => navigate(from, { replace: true }),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ email, password });
  }

  const errorMessage =
    mutation.error instanceof ApiError && mutation.error.status === 401
      ? "E-mail ou senha incorretos."
      : mutation.error?.message;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink-900 px-5 py-10">
      <div className="w-full max-w-sm">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-signal">
          Life and Money
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold leading-tight">
          Que bom te ver de novo.
        </h1>

        {expired && (
          <p role="status" className="mt-6 rounded-2xl bg-ink-800 p-4 text-sm text-text-soft">
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

          {errorMessage && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {errorMessage}
            </p>
          )}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Ainda não tem conta?{" "}
          <Link to="/register" className="font-bold text-signal">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}