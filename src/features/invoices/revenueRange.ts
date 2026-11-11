import type { Granularity } from "./revenueApi";
import { todayIso } from "../../shared/lib/dates";

function iso(date: Date): string {
  return todayIso(date);
}

/**
 * O período padrão de cada granularidade, terminando hoje: 30 dias, 12 semanas ou 12 meses. A API
 * alarga até os limites dos períodos (a segunda da primeira semana, o dia 1 do primeiro mês).
 */
export function defaultRange(granularity: Granularity, today = new Date()): { from: string; to: string } {
  const y = today.getFullYear();
  const m = today.getMonth();
  const d = today.getDate();
  switch (granularity) {
    case "DAY":
      return { from: iso(new Date(y, m, d - 29)), to: iso(today) };
    case "WEEK":
      return { from: iso(new Date(y, m, d - 7 * 11)), to: iso(today) };
    case "MONTH":
      return { from: iso(new Date(y, m - 11, 1)), to: iso(today) };
  }
}

/** O rótulo curto de cada barra: o dia, a segunda-feira da semana (dd/mm) ou o mês abreviado. */
export function barLabel(start: string, granularity: Granularity): string {
  const [year, month, day] = start.split("-").map(Number);
  if (granularity === "DAY") return String(day);
  if (granularity === "WEEK") return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
  return new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(year, month - 1, 1)).replace(".", "");
}

/** O período de uma barra, por extenso, para o leitor de tela e o destaque da barra tocada. */
export function periodLabel(start: string, end: string, granularity: Granularity): string {
  const format = (value: string, options: Intl.DateTimeFormatOptions) => {
    const [y, mo, d] = value.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-BR", options).format(new Date(y, mo - 1, d));
  };
  if (granularity === "DAY") return format(start, { day: "numeric", month: "long" });
  if (granularity === "WEEK") return `${format(start, { day: "numeric", month: "short" })} a ${format(end, { day: "numeric", month: "short" })}`;
  const text = format(start, { month: "long", year: "numeric" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}
