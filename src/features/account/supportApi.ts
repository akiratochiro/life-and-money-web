import { useMutation } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { expectNoContent } from "../../shared/api/problem";
import type { components } from "../../shared/api/schema";

export type SupportMessage = components["schemas"]["SupportRequest"];

/** Manda a mensagem ao suporte (decisão 35). O endereço de destino só existe no servidor. */
export function useContactSupport() {
  return useMutation({
    mutationFn: (body: SupportMessage) => expectNoContent(api.POST("/support", { body })),
  });
}
