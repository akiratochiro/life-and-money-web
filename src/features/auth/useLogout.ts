import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { revokeSession } from "../../shared/auth/session";

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return async () => {
    // Revoga a sessão no servidor antes de limpar o cache: só assim o refresh token guardado
    // no cookie deixa de valer, em vez de ficar utilizável até vencer.
    await revokeSession();
    queryClient.clear();
    navigate("/login", { replace: true });
  };
}
