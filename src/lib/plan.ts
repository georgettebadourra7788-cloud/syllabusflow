export const FREE_MONTHLY_GENERATIONS = 12;
export const FREE_MAX_WEEKS = 6;
export const PRO_PRICE_LABEL = "$40/year";

export type Plan = "free" | "paid";

export interface UsageDoc {
  plan: Plan;
  generationsThisMonth: number;
  monthKey: string; // e.g. "2026-08" — UTC year-month this count applies to
  createdAt: number;
}

export function currentMonthKey(date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
