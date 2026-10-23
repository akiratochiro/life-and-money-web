export function currentMonth(today = new Date()): string {
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${today.getFullYear()}-${month}`;
}

export function monthName(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(year, monthNumber - 1, 1));
}

export function lastDayOfMonth(today = new Date()): string {
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(last);
}

export function greeting(today = new Date()): string {
  const hour = today.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function longDate(today = new Date()): string {
  const text = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" }).format(today);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayIso(today = new Date()): string {
  return toIsoDate(today);
}

export function yesterdayIso(today = new Date()): string {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return toIsoDate(yesterday);
}

export function addMonths(month: string, amount: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return currentMonth(new Date(year, monthNumber - 1 + amount, 1));
}

export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const text = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, monthNumber - 1, 1),
  );
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function dayLabel(isoDate: string, today = new Date()): string {
  if (isoDate === todayIso(today)) return "Hoje";
  if (isoDate === yesterdayIso(today)) return "Ontem";
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short" }).format(
    new Date(year, month - 1, day),
  );
}

export function firstDayOfNextMonth(today = new Date()): string {
  return toIsoDate(new Date(today.getFullYear(), today.getMonth() + 1, 1));
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(year, month - 1, day),
  );
}

export function shortMonthName(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(new Date(year, monthNumber - 1, 1))
    .replace(".", "");
}