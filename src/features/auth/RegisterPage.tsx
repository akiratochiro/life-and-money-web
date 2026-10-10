import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { register } from "./authApi";
import { ApiError } from "../../shared/api/problem";
import { TextField } from "../../shared/ui/TextField";
import { Button } from "../../shared/ui/Button";

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: () => navigate("/", { replace: true }),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate({ name, email, password });
  }

  const apiError = mutation.error instanceof ApiError ? mutation.error : null;
  const fieldErrors = apiError?.status === 400 ? apiError.fieldErrors : {};
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  let formError: string | undefined;
  if (apiError?.status === 409) {
    formError = "Este e-mail já está cadastrado.";
  } else if (!hasFieldErrors) {
    formError = mutation.error?.message;
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink-900 px-5 py-10">
      <div className="w-full max-w-sm">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-signal">
          Life and Money
        </p>
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
            error={fieldErrors.password ?? "Mínimo de 8 caracteres."}
          />

          {formError && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {formError}
            </p>
          )}

          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Criando sua conta..." : "Criar conta"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Já tem conta?{" "}
          <Link to="/login" className="font-bold text-signal">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}