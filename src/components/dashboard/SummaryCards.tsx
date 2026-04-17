"use client";
import React from "react";
import type { MonthlySummary } from "@/types/finance";
import { formatINRCompact } from "@/lib/utils";
import { TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";

interface Props {
  summary: MonthlySummary;
  prevSummary?: MonthlySummary;
}

interface CardProps {
  title: string;
  amount: number;
  prevAmount?: number;
  colorClass: string;
  bgClass: string;
}

function StatCard({ title, amount, prevAmount, colorClass, bgClass }: CardProps) {
  const delta = prevAmount !== undefined ? amount - prevAmount : undefined;
  const pct = prevAmount && prevAmount > 0 ? ((delta ?? 0) / prevAmount) * 100 : undefined;
  const isUp = (delta ?? 0) >= 0;

  return (
    <div className={`rounded-2xl p-4 ${bgClass}`}>
      <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
      <p className={`text-2xl font-bold ${colorClass}`}>
        {formatINRCompact(amount)}
      </p>
      {pct !== undefined && (
        <div className={`flex items-center gap-1 mt-1 text-xs ${isUp ? "text-green-600" : "text-red-500"}`}>
          {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{Math.abs(pct).toFixed(1)}% vs last month</span>
        </div>
      )}
    </div>
  );
}

export function SummaryCards({ summary, prevSummary }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard
        title="Total Income"
        amount={summary.totalIncome}
        prevAmount={prevSummary?.totalIncome}
        colorClass="text-blue-700 dark:text-blue-400"
        bgClass="bg-blue-50 dark:bg-blue-950/30"
      />
      <StatCard
        title="Expenses"
        amount={summary.totalExpenses}
        prevAmount={prevSummary?.totalExpenses}
        colorClass="text-red-600 dark:text-red-400"
        bgClass="bg-red-50 dark:bg-red-950/30"
      />
      <StatCard
        title="Savings"
        amount={summary.totalSavings}
        prevAmount={prevSummary?.totalSavings}
        colorClass="text-green-700 dark:text-green-400"
        bgClass="bg-green-50 dark:bg-green-950/30"
      />
      <div className="rounded-2xl p-4 bg-purple-50 dark:bg-purple-950/30">
        <p className="text-xs font-medium text-muted-foreground mb-1">Net Balance</p>
        <p className={`text-2xl font-bold ${summary.netBalance >= 0 ? "text-purple-700 dark:text-purple-400" : "text-red-600"}`}>
          {formatINRCompact(Math.abs(summary.netBalance))}
        </p>
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <ArrowUpRight className="w-3 h-3" />
          <span>{summary.netBalance >= 0 ? "Surplus" : "Deficit"}</span>
        </div>
      </div>
    </div>
  );
}
