"use client";
import React, { useState } from "react";
import type { MonthlyEntry } from "@/types/finance";
import { formatINR } from "@/lib/utils";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/defaults";
import { ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  entry: MonthlyEntry;
}

const CATEGORY_COLORS: Record<string, string> = {
  family: "bg-orange-400",
  housing: "bg-indigo-400",
  insurance: "bg-blue-400",
  loan: "bg-red-400",
  personal: "bg-pink-400",
  creditcard: "bg-purple-400",
  education: "bg-cyan-400",
  other: "bg-gray-400",
};

export function CategoryBreakdown({ entry }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Group expense items by category
  const categoryTotals: Record<string, { total: number; items: typeof entry.expenses.items }> = {};
  for (const item of entry.expenses.items) {
    if (!categoryTotals[item.category]) {
      categoryTotals[item.category] = { total: 0, items: [] };
    }
    categoryTotals[item.category].total += item.actualAmount;
    categoryTotals[item.category].items.push(item);
  }

  const totalExpenses = entry.expenses.totalExpenses;
  const sorted = Object.entries(categoryTotals)
    .filter(([, v]) => v.total > 0)
    .sort(([, a], [, b]) => b.total - a.total);

  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
      >
        <span className="font-semibold text-sm">Expense Breakdown</span>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </button>

      <div className="px-4 pb-3 space-y-2">
        {sorted.map(([cat, { total, items }]) => {
          const pct = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0;
          const color = CATEGORY_COLORS[cat] ?? "bg-gray-400";
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted-foreground w-20 shrink-0">
                  {EXPENSE_CATEGORY_LABELS[cat] ?? cat}
                </span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color} transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-16 text-right">{formatINR(total)}</span>
              </div>
              {expanded && (
                <div className="ml-22 pl-[5.5rem] space-y-0.5 mb-2">
                  {items.filter(i => i.actualAmount > 0).map((item) => (
                    <div key={item.id} className="flex justify-between text-xs text-muted-foreground">
                      <span>{item.label}</span>
                      <span>{formatINR(item.actualAmount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
