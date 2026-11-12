import type { CalendarEvent } from "./calendarApi";
import type { BadgeTone } from "../../shared/ui/Badge";
import { formatCents, toCents } from "../../shared/lib/money";

const money = (value: number) => formatCents(toCents(value));

/** Para onde o toque leva: a tela onde cada coisa é paga. O calendário só mostra (decisão 32). */
export function linkOf(event: CalendarEvent): string {
  switch (event.link.kind) {
    case "COMPANY_TAXES":
      return `/companies/${event.link.companyId}/taxes`;
    case "COMPANY_EXPENSES":
      return `/companies/${event.link.companyId}/expenses`;
    default:
      return "/bills";
  }
}

export function statusOf(event: CalendarEvent): { tone: BadgeTone; label: string } {
  if (event.nothingToPay) return { tone: "saving", label: "Nada a pagar" };
  if (event.status === "OVERDUE") return { tone: "danger", label: "Atrasado" };
  if (event.status === "PAID") {
    const label = event.source === "DECLARATION" ? "Entregue" : event.direction === "IN" ? "Recebido" : "Pago";
    return { tone: "income", label };
  }
  return { tone: "warning", label: event.direction === "IN" ? "A receber" : "Pendente" };
}

/** O valor de cada evento: o pago, senão o previsto. A API manda null no campo vazio, por isso o != null. */
export function amountOf(event: CalendarEvent): string {
  if (event.source === "DECLARATION") return "Declaração";
  const value = event.status === "PAID" && event.paidAmount != null ? event.paidAmount : event.expectedAmount;
  return value != null ? money(value) : "Sem valor";
}
