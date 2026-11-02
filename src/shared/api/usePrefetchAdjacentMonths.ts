import { useEffect } from "react";
import { useQueryClient, type FetchQueryOptions, type QueryKey } from "@tanstack/react-query";
import { addMonths } from "../lib/dates";

/**
 * Busca em segundo plano o mês anterior e o próximo ao que está na tela, para a troca de mês
 * aparecer na hora. O prefetchQuery respeita o staleTime: um mês já fresco no cache não gera
 * requisição, então ir e voltar entre meses não multiplica as chamadas.
 */
export function usePrefetchAdjacentMonths<TData, TKey extends QueryKey>(
  month: string,
  queryFor: (month: string) => FetchQueryOptions<TData, Error, TData, TKey>,
) {
  const queryClient = useQueryClient();
  useEffect(() => {
    for (const neighbor of [addMonths(month, -1), addMonths(month, 1)]) {
      void queryClient.prefetchQuery(queryFor(neighbor));
    }
    // queryFor costuma ser uma função de módulo, estável; o que muda a busca é o mês.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, queryClient]);
}
