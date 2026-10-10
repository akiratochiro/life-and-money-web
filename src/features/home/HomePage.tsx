import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { api } from "../../shared/api/client";
import { unwrap } from "../../shared/api/problem";
import { tokenStorage } from "../../shared/auth/tokenStorage";

export function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: me, isPending } = useQuery({
    queryKey: ["me"],
    queryFn: () => unwrap(api.GET("/users/me")),
  });

  function logout() {
    tokenStorage.clear();
    queryClient.clear();
    navigate("/login", { replace: true });
  }

  return (
    <main className="min-h-dvh bg-ink-900 p-6">
      <h1 className="font-display text-2xl font-semibold">
        {isPending ? "Carregando..." : `Olá, ${me?.name}`}
      </h1>
      <button onClick={logout} className="mt-6 font-bold text-signal">
        Sair
      </button>
    </main>
  );
}