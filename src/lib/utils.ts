import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { MonthlyEntry, IncomeSection, ExpensesSection, SavingsSection, MonthlySummary } from "@/types/finance";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Currency helpers (all amounts in paise) ──────────────────────────────

/** Convert rupees (number/string) to paise integer */
export function toINR(rupees: number | string): number {
  const n = typeof rupees === "string" ? parseFloat(rupees) : rupees;
  if (isNaN(n)) return 0;
  return Math.round(n * 100);
}

/** Convert paise to rupees float */
export function fromINR(paise: number): number {
  return paise / 100;
}

/** Format paise as ₹X,XX,XXX.XX (Indian number system) */
export function formatINR(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/** Format paise as compact: ₹12.5L, ₹3.2K etc. */
export function formatINRCompact(paise: number): string {
  const rupees = paise / 100;
  if (rupees >= 10000000) return `₹${(rupees / 10000000).toFixed(2)}Cr`;
  if (rupees >= 100000) return `₹${(rupees / 100000).toFixed(2)}L`;
  if (rupees >= 1000) return `₹${(rupees / 1000).toFixed(1)}K`;
  return formatINR(paise);
}

/** Parse a formatted/raw rupee string to paise */
export function parseRupeeInput(value: string): number {
  const cleaned = value.replace(/[₹,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : Math.round(n * 100);
}

// ─── Month helpers ─────────────────────────────────────────────────────────

/** Returns "2026-04" from a Date */
export function getMonthId(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Returns "April 2026" from "2026-04" */
export function getMonthLabel(monthId: string): string {
  const [y, m] = monthId.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/** Returns "Apr 2026" (short) */
export function getMonthShortLabel(monthId: string): string {
  const [y, m] = monthId.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

/** Get previous month id */
export function getPrevMonthId(monthId: string): string {
  const [y, m] = monthId.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return getMonthId(d);
}

/** Get next month id */
export function getNextMonthId(monthId: string): string {
  const [y, m] = monthId.split("-").map(Number);
  const d = new Date(y, m, 1);
  return getMonthId(d);
}

/** List of last N month IDs (most recent first) */
export function getRecentMonthIds(n: number = 12): string[] {
  const ids: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    ids.push(getMonthId(d));
  }
  return ids;
}

// ─── Summary computation ───────────────────────────────────────────────────

export function computeSummary(
  income: IncomeSection,
  expenses: ExpensesSection,
  savings: SavingsSection
): MonthlySummary {
  const totalIncome =
    income.salary +
    income.bonusOldBalance +
    income.interest +
    income.dividend +
    income.businessIncome +
    income.passiveIncome +
    income.freelanceTotal;

  const totalExpenses = expenses.totalExpenses + expenses.totalFreelanceExpenses;
  const totalSavings = savings.totalFromSalary + savings.totalFromFreelance;
  const netBalance = totalIncome - totalExpenses - totalSavings;
  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  const balanceAfterExpenses = totalIncome - totalExpenses;
  const balanceRemainingFromSalary =
    income.salary +
    income.bonusOldBalance -
    expenses.totalExpenses -
    savings.totalFromSalary;
  const balanceRemainingFromFreelance =
    income.freelanceTotal - savings.totalFromFreelance - expenses.totalFreelanceExpenses;

  return {
    totalIncome,
    totalExpenses,
    totalSavings,
    netBalance,
    savingsRate,
    freelanceTotal: income.freelanceTotal,
    salaryBalance: income.salaryAccountBalance,
    balanceAfterExpenses,
    balanceRemainingFromSalary,
    balanceRemainingFromFreelance,
  };
}

/** Recompute all totals within an entry (call before saving) */
export function recomputeEntry(entry: Partial<MonthlyEntry>): Partial<MonthlyEntry> {
  if (!entry.income || !entry.expenses || !entry.savings) return entry;

  // Recompute freelance total
  const freelanceTotal = entry.income.freelanceItems?.reduce(
    (sum, item) => sum + item.amount,
    0
  ) ?? 0;

  // Recompute expenses total
  const totalExpenses =
    entry.expenses.items?.reduce((sum, item) => sum + item.actualAmount, 0) ?? 0;
  const totalFreelanceExpenses =
    entry.expenses.freelanceExpenses?.reduce((sum, item) => sum + item.amount, 0) ?? 0;

  // Recompute savings totals
  const totalFromSalary =
    entry.savings.fromSalary?.reduce((sum, item) => sum + item.actualAmount, 0) ?? 0;
  const totalFromFreelance =
    entry.savings.fromFreelance?.reduce((sum, item) => sum + item.amount, 0) ?? 0;

  const updatedIncome = { ...entry.income, freelanceTotal };
  const updatedExpenses = {
    ...entry.expenses,
    totalExpenses,
    totalFreelanceExpenses,
  };
  const updatedSavings = {
    ...entry.savings,
    totalFromSalary,
    totalFromFreelance,
    totalSavings: totalFromSalary + totalFromFreelance,
  };

  const summary = computeSummary(updatedIncome as IncomeSection, updatedExpenses as ExpensesSection, updatedSavings as SavingsSection);

  return {
    ...entry,
    income: updatedIncome as IncomeSection,
    expenses: updatedExpenses as ExpensesSection,
    savings: updatedSavings as SavingsSection,
    summary,
    updatedAt: new Date().toISOString(),
  };
}

// ─── Misc ──────────────────────────────────────────────────────────────────

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatDate(isoDate: string): string {
  if (!isoDate) return "-";
  return new Date(isoDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function savingsRateColor(rate: number): string {
  if (rate >= 40) return "text-green-500";
  if (rate >= 25) return "text-yellow-500";
  return "text-red-500";
}

export function savingsRateBg(rate: number): string {
  if (rate >= 40) return "bg-green-500";
  if (rate >= 25) return "bg-yellow-500";
  return "bg-red-500";
}
