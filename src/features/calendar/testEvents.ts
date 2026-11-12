import type { CalendarEvent } from "./calendarApi";

/** Um evento como a API manda: com null nos campos vazios. */
export function event(overrides: Partial<Record<keyof CalendarEvent, unknown>> = {}): CalendarEvent {
  return {
    id: "TAX:12:2026-10", source: "TAX", scope: "PJ", company: { id: 3, name: "Estúdio Ana", emoji: "🎨" },
    title: "DAS do Simples Nacional", detail: "Competência 10/2026", dueDate: "2026-11-23", payableUntil: "2026-11-23",
    status: "PENDING", direction: "OUT", expectedAmount: 399, paidAmount: null, paidOn: null, nothingToPay: false,
    link: { kind: "COMPANY_TAXES", companyId: 3, month: "2026-11" },
    ...overrides,
  } as unknown as CalendarEvent;
}
