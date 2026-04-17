"use client";
import React from "react";
import type { MonthlyEntry } from "@/types/finance";
import { formatINR, getMonthLabel, formatDate, savingsRateColor } from "@/lib/utils";

interface Props {
  data: Partial<MonthlyEntry>;
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}

export function Step5_Review({ data }: Props) {
  const income = data.income;
  const expenses = data.expenses;
  const savings = data.savings;
  const monthId = data.id ?? "";

  const totalIncome = (income?.salary ?? 0) + (income?.bonusOldBalance ?? 0) +
    (income?.interest ?? 0) + (income?.dividend ?? 0) +
    (income?.businessIncome ?? 0) + (income?.passiveIncome ?? 0) +
    (income?.freelanceTotal ?? 0);

  const totalExpenses = (expenses?.totalExpenses ?? 0) + (expenses?.totalFreelanceExpenses ?? 0);
  const totalSavings = (savings?.totalFromSalary ?? 0) + (savings?.totalFromFreelance ?? 0);
  const netBalance = totalIncome - totalExpenses - totalSavings;
  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Review</h2>
        <p className="text-muted-foreground text-sm mt-1">
          {getMonthLabel(monthId)} — confirm before saving.
        </p>
      </div>

      {/* Income summary */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/30 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
          Income
        </div>
        <div className="px-4 py-1">
          <Row label="Salary Credit Date" value={formatDate(income?.salaryDate ?? "")} />
          <Row label="Salary (Net)" value={formatINR(income?.salary ?? 0)} />
          {(income?.bonusOldBalance ?? 0) > 0 && <Row label="Bonus / Old Balance" value={formatINR(income?.bonusOldBalance ?? 0)} />}
          {(income?.interest ?? 0) > 0 && <Row label="Interest" value={formatINR(income?.interest ?? 0)} />}
          {(income?.dividend ?? 0) > 0 && <Row label="Dividend" value={formatINR(income?.dividend ?? 0)} />}
          {(income?.businessIncome ?? 0) > 0 && <Row label="Business Income" value={formatINR(income?.businessIncome ?? 0)} />}
          {(income?.passiveIncome ?? 0) > 0 && <Row label="Passive Income" value={formatINR(income?.passiveIncome ?? 0)} />}
          {(income?.freelanceTotal ?? 0) > 0 && <Row label="Freelance Income" value={formatINR(income?.freelanceTotal ?? 0)} />}
          <Row label="Salary Account Balance" value={formatINR(income?.salaryAccountBalance ?? 0)} />
          <Row label="Total Income" value={formatINR(totalIncome)} highlight />
        </div>
      </div>

      {/* Expenses summary */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2 bg-red-50 dark:bg-red-950/30 text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-400">
          Expenses
        </div>
        <div className="px-4 py-1">
          {expenses?.items.filter(i => i.actualAmount > 0).map((item) => (
            <Row key={item.id} label={item.label} value={formatINR(item.actualAmount)} />
          ))}
          {(expenses?.totalFreelanceExpenses ?? 0) > 0 && (
            <Row label="Freelance Expenses" value={formatINR(expenses?.totalFreelanceExpenses ?? 0)} />
          )}
          <Row label="Total Expenses" value={formatINR(totalExpenses)} highlight />
        </div>
      </div>

      {/* Savings summary */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2 bg-green-50 dark:bg-green-950/30 text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
          Savings & Investments
        </div>
        <div className="px-4 py-1">
          {savings?.fromSalary.filter(i => i.actualAmount > 0).map((item) => (
            <Row key={item.id} label={item.label} value={formatINR(item.actualAmount)} />
          ))}
          {savings?.fromFreelance.filter(i => i.amount > 0).map((item) => (
            <Row key={item.id} label={`${item.label} (Freelance)`} value={formatINR(item.amount)} />
          ))}
          <Row label="Total Savings" value={formatINR(totalSavings)} highlight />
        </div>
      </div>

      {/* Final summary */}
      <div className="rounded-xl bg-muted/30 p-4 space-y-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Summary</h3>
        <div className="flex justify-between">
          <span className="text-sm">Total Income</span>
          <span className="font-bold">{formatINR(totalIncome)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm">Total Expenses</span>
          <span className="font-bold text-destructive">{formatINR(totalExpenses)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm">Total Savings</span>
          <span className="font-bold text-green-600">{formatINR(totalSavings)}</span>
        </div>
        <div className="border-t pt-3 flex justify-between">
          <span className="font-semibold">Net Balance</span>
          <span className={`font-bold text-lg ${netBalance >= 0 ? "text-green-600" : "text-destructive"}`}>
            {formatINR(netBalance)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm">Savings Rate</span>
          <span className={`font-bold ${savingsRateColor(savingsRate)}`}>
            {savingsRate.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
