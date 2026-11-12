import { FiscalCalendar } from "./FiscalCalendar";
import { useCompanyContext } from "../company/companyContext";

/** O calendário de tudo: contas pessoais e empresas, com o filtro (decisão 32). */
export function CalendarPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Calendário</h1>
      <FiscalCalendar />
    </div>
  );
}

/** A aba "Calendário" de uma empresa: o mesmo calendário, travado nela. */
export function CompanyCalendarPage() {
  const company = useCompanyContext();
  return <FiscalCalendar companyId={company.id} />;
}
