import type { BudgetLine } from "./homeApi";

export function isAlert(line: BudgetLine): boolean {
  return line.status === "EXCEEDED" || line.status === "WARNING";
}

export function bySeverity(a: BudgetLine, b: BudgetLine): number {
  if (a.status !== b.status) {
    return a.status === "EXCEEDED" ? -1 : 1;
  }
  return (b.usedPercentage ?? Infinity) - (a.usedPercentage ?? Infinity);
}