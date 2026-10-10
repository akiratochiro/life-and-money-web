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