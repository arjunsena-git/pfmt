"use client";
import React, { useState } from "react";
import type { MonthlyEntry } from "@/types/finance";
import { formatINR, formatINRCompact, getMonthShortLabel } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  entries: MonthlyEntry[];
}

interface MonthRow {
  monthId: string;
  label: string;
  freelanceTotal: number; // paise
  sources: Array<{ source: string; amount: number }>;
}

export function FreelanceTrend({ entries }: Props) {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  // Last 12 months sorted oldest → newest for the chart
  const rows: MonthRow[] = [...entries]
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(-12)
    .map((e) => ({
      monthId: e.id,
      label: getMonthShortLabel(e.id),
      freelanceTotal: e.income.freelanceTotal,
      sources: (e.income.freelanceItems ?? []).map((item) => ({
        source: item.source,
        amount: item.amount,
      })),
    }));

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-bold mb-2">Freelance Income Trend</h2>
        <p className="text-sm text-muted-foreground">No monthly entries yet.</p>
      </div>
    );
  }

  const maxVal = Math.max(...rows.map((r) => r.freelanceTotal), 1);
  const total = rows.reduce((s, r) => s + r.freelanceTotal, 0);
  const avg = total / rows.length;
  const nonZeroRows = rows.filter((r) => r.freelanceTotal > 0);
  const bestRow = nonZeroRows.length > 0
    ? nonZeroRows.reduce((best, r) => (r.freelanceTotal > best.freelanceTotal ? r : best))
    : null;

  // Trend: compare first half vs second half average
  const firstHalf = rows.slice(0, Math.floor(rows.length / 2));
  const secondHalf = rows.slice(Math.floor(rows.length / 2));
  const firstAvg = firstHalf.reduce((s, r) => s + r.freelanceTotal, 0) / (firstHalf.length || 1);
  const secondAvg = secondHalf.reduce((s, r) => s + r.freelanceTotal, 0) / (secondHalf.length || 1);
  const trendPct = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
  const TrendIcon = trendPct > 5 ? TrendingUp : trendPct < -5 ? TrendingDown : Minus;
  const trendColor = trendPct > 5 ? "text-green-500" : trendPct < -5 ? "text-destructive" : "text-muted-foreground";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">Freelance Income</h2>
        <span className="text-xs text-muted-foreground">Last {rows.length} months</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-muted/30 px-3 py-2.5 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Total</p>
          <p className="text-sm font-bold text-foreground">{formatINRCompact(total)}</p>
        </div>
        <div className="rounded-xl bg-muted/30 px-3 py-2.5 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Monthly Avg</p>
          <p className="text-sm font-bold text-foreground">{formatINRCompact(avg)}</p>
        </div>
        <div className="rounded-xl bg-muted/30 px-3 py-2.5 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Trend</p>
          <p className={`text-sm font-bold flex items-center justify-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            {trendPct === 0 ? "—" : `${trendPct > 0 ? "+" : ""}${Math.round(trendPct)}%`}
          </p>
        </div>
      </div>

      {bestRow && (
        <p className="text-xs text-muted-foreground">
          Best month: <span className="text-foreground font-medium">{bestRow.label}</span>{" "}
          — {formatINR(bestRow.freelanceTotal)}
        </p>
      )}

      {/* Bar chart */}
      <div className="space-y-2">
        {rows.map((row) => {
          const barPct = maxVal > 0 ? (row.freelanceTotal / maxVal) * 100 : 0;
          const isExpanded = expandedMonth === row.monthId;
          const hasSources = row.sources.length > 0;

          return (
            <div key={row.monthId}>
              <button
                type="button"
                onClick={() => hasSources && setExpandedMonth(isExpanded ? null : row.monthId)}
                className={`w-full text-left ${hasSources ? "cursor-pointer" : "cursor-default"}`}
              >
                <div className="flex items-center gap-2">
                  {/* Month label */}
                  <span className="text-xs text-muted-foreground w-16 shrink-0 text-right">
                    {row.label}
                  </span>

                  {/* Bar track */}
                  <div className="flex-1 h-6 rounded-lg bg-muted/30 relative overflow-hidden">
                    {row.freelanceTotal > 0 && (
                      <div
                        className="absolute inset-y-0 left-0 rounded-lg bg-primary/70 transition-all duration-500"
                        style={{ width: `${barPct}%` }}
                      />
                    )}
                  </div>

                  {/* Amount */}
                  <span className="text-xs font-medium text-foreground w-16 shrink-0 text-right">
                    {row.freelanceTotal > 0 ? formatINRCompact(row.freelanceTotal) : "—"}
                  </span>

                  {/* Expand chevron */}
                  {hasSources && (
                    <span className="text-muted-foreground shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                  )}
                  {!hasSources && <span className="w-3.5 shrink-0" />}
                </div>
              </button>

              {/* Expanded sources */}
              {isExpanded && row.sources.length > 0 && (
                <div className="mt-1 ml-[4.5rem] mr-[4.5rem] rounded-xl bg-muted/20 border border-border/50 divide-y divide-border/30">
                  {row.sources.map((s, i) => (
                    <div key={i} className="flex justify-between items-center px-3 py-1.5 text-xs">
                      <span className="text-muted-foreground truncate flex-1">{s.source}</span>
                      <span className="font-medium text-foreground ml-3 shrink-0">{formatINR(s.amount)}</span>
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
