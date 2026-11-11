import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import { expectNoContent, unwrap } from "../../shared/api/problem";
import type { components } from "../../shared/api/schema";
import { useInvalidate } from "../../shared/api/invalidation";

export type Company = components["schemas"]["CompanyResponse"];
export type CompanyRegime = components["schemas"]["CompanyRegimeResponse"];
export type Partner = components["schemas"]["PartnerResponse"];
export type NewCompany = components["schemas"]["CreateCompanyRequest"];
export type CompanyUpdate = components["schemas"]["UpdateCompanyRequest"];
export type RegimeChange = components["schemas"]["ChangeRegimeRequest"];
export type CnpjLookup = components["schemas"]["CnpjLookupResponse"];
export type LegalNature = CompanyRegime["legalNature"];
export type TaxRegime = CompanyRegime["taxRegime"];
export type AnnexConfig = NonNullable<CompanyRegime["annexConfig"]>;
export type MeiActivity = NonNullable<CompanyRegime["meiActivity"]>;

/**
 * Todas as chaves começam com "companies": uma mudança em qualquer coisa da empresa (dados,
 * enquadramento, sócios) recarrega a família inteira, porque a empresa traz o enquadramento atual
 * e o menu lateral mostra o nome e o emoji.
 */
export function useCompanies(includeArchived = false) {
  return useQuery({
    queryKey: ["companies", "list", { includeArchived }],
    queryFn: () => unwrap(api.GET("/companies", { params: { query: { includeArchived } } })),
  });
}

export function useCompany(id: number) {
  return useQuery({
    queryKey: ["companies", id],
    queryFn: () => unwrap(api.GET("/companies/{id}", { params: { path: { id } } })),
  });
}

export function useRegimes(id: number) {
  return useQuery({
    queryKey: ["companies", id, "regimes"],
    queryFn: () => unwrap(api.GET("/companies/{id}/regimes", { params: { path: { id } } })),
  });
}

export function usePartners(companyId: number) {
  return useQuery({
    queryKey: ["companies", companyId, "partners"],
    queryFn: () => unwrap(api.GET("/companies/{companyId}/partners", { params: { path: { companyId } } })),
  });
}

function useInvalidateCompanies() {
  const invalidate = useInvalidate();
  return () => invalidate("company");
}

export function useCreateCompany() {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: (body: NewCompany) => unwrap(api.POST("/companies", { body })),
    onSuccess: invalidate,
  });
}

/** Edição parcial: o que não vier fica como está; CNPJ vazio remove o CNPJ. */
export function useUpdateCompany(id: number) {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: (body: CompanyUpdate) => unwrap(api.PATCH("/companies/{id}", { params: { path: { id } }, body })),
    onSuccess: invalidate,
  });
}

export function useArchiveCompany() {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: (id: number) => unwrap(api.POST("/companies/{id}/archive", { params: { path: { id } } })),
    onSuccess: invalidate,
  });
}

export function useUnarchiveCompany() {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: (id: number) => unwrap(api.POST("/companies/{id}/unarchive", { params: { path: { id } } })),
    onSuccess: invalidate,
  });
}

export function useChangeRegime(id: number) {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: (body: RegimeChange) =>
      unwrap(api.POST("/companies/{id}/regimes", { params: { path: { id } }, body })),
    onSuccess: invalidate,
  });
}

export function useUndoRegimeChange(id: number) {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: () => unwrap(api.DELETE("/companies/{id}/regimes/latest", { params: { path: { id } } })),
    onSuccess: invalidate,
  });
}

export function useRenamePartner(companyId: number) {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: ({ partnerId, name }: { partnerId: number; name: string }) =>
      unwrap(
        api.PATCH("/companies/{companyId}/partners/{partnerId}", {
          params: { path: { companyId, partnerId } },
          body: { name },
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useRemovePartner(companyId: number) {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: (partnerId: number) =>
      expectNoContent(
        api.DELETE("/companies/{companyId}/partners/{partnerId}", { params: { path: { companyId, partnerId } } }),
      ),
    onSuccess: invalidate,
  });
}

/**
 * Consulta sob demanda (o botão "Buscar dados"), por isso é mutação e não query: não há nada a
 * manter em cache no front, e cada clique é um pedido. A API nunca falha por causa da BrasilAPI:
 * ela responde available=false e o formulário segue à mão.
 */
export function useCnpjLookup() {
  return useMutation({
    mutationFn: (cnpj: string) => unwrap(api.GET("/cnpj/{cnpj}", { params: { path: { cnpj } } })),
  });
}
