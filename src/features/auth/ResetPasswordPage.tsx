import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { resetPassword } from "./authApi";
import { ApiError } from "../../shared/api/problem";
import { TextField } from "../../shared/ui/TextField";
import { Button } from "../../shared/ui/Button";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // O token chega na URL, vindo do e-mail. Ele é lido uma vez para a memória e sai da URL logo em
  // seguida: assim não fica no histórico do navegador, num print da tela ou num link copiado.
  const [token] = useState(() => searchParams.get("token"));
  const tokenInUrl = searchParams.has("token");
  useEffect(() => {
    if (tokenInUrl) {
      navigate("/reset-password", { replace: true });
    }
  }, [tokenInUrl, navigate]);

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [mismatch, setMismatch] = useState(false);

  const mutation = useMutation({
    mutationFn: (newPassword: string) => resetPassword(token ?? "", newPassword),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmation) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    mutation.mutate(password);
  }

  const apiError = mutation.error instanceof ApiError ? mutation.error : undefined;
  const passwordError = apiError?.fieldErrors.newPassword;
  // Link inválido, usado ou expirado: a única saída é pedir outro.
  const linkError = apiError && !passwordError ? apiError.message : undefined;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink-900 px-5 py-10">
      <div className="w-full max-w-sm">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-signal">
          Life and Money
        </p>

        {mutation.isSuccess ? (
          <>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight">Senha criada.</h1>
            <p role="status" className="mt-3 text-sm leading-relaxed text-text-soft">
              Por segurança, saímos da sua conta em todos os aparelhos. Entre de novo com a senha nova.
            </p>
            <Link
              to="/login"
              className="mt-8 flex h-14 items-center justify-center rounded-full bg-signal px-6 font-bold text-ink-900"
            >
              Entrar
            </Link>
          </>
        ) : !token || linkError ? (
          <>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight">Esse link não vale mais.</h1>
            <p role="alert" className="mt-3 text-sm leading-relaxed text-text-soft">
              {linkError ?? "O link está incompleto. Abra de novo o link do e-mail ou peça outro."}
            </p>
            <Link
              to="/forgot-password"
              className="mt-8 flex h-14 items-center justify-center rounded-full bg-signal px-6 font-bold text-ink-900"
            >
              Pedir outro link
            </Link>
          </>
        ) : (
          <>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight">Crie uma senha nova.</h1>

            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5 rounded-hero bg-surface p-6 shadow-card">
              <TextField
                label="Senha nova"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                value={password}
                error={passwordError}
                onChange={(e) => setPassword(e.target.value)}
              />
              <TextField
                label="Repita a senha nova"
                type="password"
                autoComplete="new-password"
                required
                value={confirmation}
                error={mismatch ? "As duas senhas não são iguais." : undefined}
                onChange={(e) => setConfirmation(e.target.value)}
              />

              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : "Salvar senha nova"}
              </Button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
