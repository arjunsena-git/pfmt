"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useMonthHistory } from "@/hooks/useMonthHistory";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { SavingsRateGauge } from "@/components/dashboard/SavingsRateGauge";
import { CategoryBreakdown } from "@/components/dashboard/CategoryBreakdown";
import { Button } from "@/components/ui/button";
import { formatINR, getMonthLabel, getMonthId, getPrevMonthId } from "@/lib/utils";
import { PlusCircle, ChevronLeft, ChevronRight } from "lucide-react";

export default function DashboardPage() {
  const { entries, isLoading } = useMonthHistory();
  const [selectedMonthId, setSelectedMonthId] = useState(getMonthId());

  const entry = entries.find((e) => e.id === selectedMonthId);
  const prevEntry = entries.find((e) => e.id === getPrevMonthId(selectedMonthId));

  const canGoNext = selectedMonthId < getMonthId();
  const canGoPrev = entries.some((e) => e.id < selectedMonthId);

  const prevMonth = () => {
    const prev = getPrevMonthId(selectedMonthId);
    setSelectedMonthId(prev);
  };

  const nextMonth = () => {
    const [y, m] = selectedMonthId.split("-").map(Number);
    const next = new Date(y, m, 1);
    const nextId = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
    setSelectedMonthId(nextId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold">Finance Dashboard</h1>
        <Link href="/entry">
          <Button size="sm" className="gap-1.5 h-9">
            <PlusCircle className="w-4 h-4" />
            New Entry
          </Button>
        </Link>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-between bg-card rounded-2xl border border-border px-4 py-3">
        <button
          onClick={prevMonth}
          className="p-1 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="font-semibold text-base">{getMonthLabel(selectedMonthId)}</h2>
        <button
          onClick={nextMonth}
          disabled={!canGoNext}
          className="p-1 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {!entry ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="text-5xl">📊</div>
          <p className="text-muted-foreground font-medium">No entry for {getMonthLabel(selectedMonthId)}</p>
          <Link href={`/entry?month=${selectedMonthId}`}>
            <Button className="gap-2">
              <PlusCircle className="w-4 h-4" />
              Start this month's entry
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Savings Rate Gauge */}
          <div className="flex justify-center py-2">
            <SavingsRateGauge rate={entry.summary.savingsRate} />
          </div>

          {/* Summary Cards */}
          <SummaryCards
            summary={entry.summary}
            prevSummary={prevEntry?.summary}
          />

          {/* Breakdown tiles */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Balance After Expenses</p>
              <p className="text-lg font-bold text-foreground">{formatINR(entry.summary.balanceAfterExpenses)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground mb-1">Salary Remaining</p>
              <p className="text-lg font-bold text-foreground">{formatINR(entry.summary.balanceRemainingFromSalary)}</p>
            </div>
            {entry.summary.freelanceTotal > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4 col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Freelance Net</p>
                <p className="text-lg font-bold text-foreground">
                  {formatINR(entry.summary.balanceRemainingFromFreelance)}
                  <span className="text-xs text-muted-foreground ml-2">
                    of {formatINR(entry.summary.freelanceTotal)} earned
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Expense category breakdown */}
          <CategoryBreakdown entry={entry} />

          {/* Edit link */}
          <Link href={`/entry/${selectedMonthId}`} className="block">
            <Button variant="outline" className="w-full">
              Edit {getMonthLabel(selectedMonthId)} entry
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}
