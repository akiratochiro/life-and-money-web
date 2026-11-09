import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { confirmEmail } from "./authApi";
import { Button } from "../../shared/ui/Button";
import { PendingLabel } from "../../shared/ui/PendingLabel";
import { Logo } from "../../shared/brand/Logo";

/**
 * O destino do link de confirmação do cadastro.
 *
 * <p>Confirma com um clique, e não ao abrir: antivírus e leitores de e-mail abrem os links para
 * conferir, e uma confirmação automática deixaria quem cadastrou o e-mail de outra pessoa (com a
 * senha dele) ganhar a conta sem que a dona do e-mail fizesse nada.
 */
export function ConfirmEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Como na redefinição de senha: o token vai para a memória e sai da URL, para não ficar no
  // histórico, num print ou num link copiado.
  const [token] = useState(() => searchParams.get("token"));
  const tokenInUrl = searchParams.has("token");
  useEffect(() => {
    if (tokenInUrl) {
      navigate("/confirm-email", { replace: true });
    }
  }, [tokenInUrl, navigate]);

  const mutation = useMutation({ mutationFn: () => confirmEmail(token ?? "") });

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-5 py-10">
      <div className="w-full max-w-sm">
        <Logo />

        {mutation.isSuccess ? (
          <>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight">Conta ativada!</h1>
            <p role="status" className="mt-3 text-sm leading-relaxed text-text-soft">
              Seu e-mail foi confirmado. Agora é só entrar com a senha que você escolheu.
            </p>
            <Link
              to="/login"
              className="mt-8 flex h-14 items-center justify-center rounded-full bg-accent px-6 font-bold text-on-accent shadow-clay-accent"
            >
              Entrar
            </Link>
          </>
        ) : !token || mutation.isError ? (
          <>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight">Esse link não vale mais.</h1>
            <p role="alert" className="mt-3 text-sm leading-relaxed text-text-soft">
              {mutation.error?.message ?? "O link está incompleto. Abra de novo o link do e-mail ou faça o cadastro outra vez."}
            </p>
            <Link
              to="/register"
              className="mt-8 flex h-14 items-center justify-center rounded-full bg-accent px-6 font-bold text-on-accent shadow-clay-accent"
            >
              Fazer o cadastro de novo
            </Link>
          </>
        ) : (
          <>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight">Falta só confirmar.</h1>
            <p className="mt-3 text-sm leading-relaxed text-text-soft">
              Toque no botão para confirmar que este e-mail é seu e ativar a conta.
            </p>
            <Button className="mt-8 w-full" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              <PendingLabel pending={mutation.isPending} pendingText="Ativando a conta…">
                Confirmar meu e-mail
              </PendingLabel>
            </Button>
          </>
        )}
      </div>
    </main>
  );
}
