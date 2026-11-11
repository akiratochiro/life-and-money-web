import { useOutletContext } from "react-router";
import type { Company } from "./companyApi";

/** A empresa carregada pelo CompanyLayout, para as abas não buscarem de novo. */
export function useCompanyContext() {
  return useOutletContext<Company>();
}
