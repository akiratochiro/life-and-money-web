import type { ComponentProps } from "react";
import type { BillOccurrence } from "./billsApi";
import { MonthCalendar } from "../../shared/ui/MonthCalendar";

export { Marker } from "../../shared/ui/MonthCalendar";

/** O calendário das Contas: o componente único do app (decisão 32), com as palavras no feminino. */
export function BillCalendar(props: Omit<ComponentProps<typeof MonthCalendar>, "occurrences" | "words"> & { occurrences: BillOccurrence[] }) {
  return <MonthCalendar {...props} />;
}
