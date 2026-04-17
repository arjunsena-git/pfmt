"use client";
import React, { useState, useRef } from "react";
import { useMonthHistory } from "@/hooks/useMonthHistory";
import { Button } from "@/components/ui/button";
import { getMonthLabel, formatINRCompact } from "@/lib/utils";
import { Sparkles, ChevronDown, Loader2 } from "lucide-react";
import type { MonthlyEntry } from "@/types/finance";
import type { MonthSnapshot } from "@/app/api/insights/route";
import { FreelanceTrend } from "@/components/insights/FreelanceTrend";

// ─── Period helpers ───────────────────────────────────────────────────────

type PeriodKey = "1m" | "3m" | "6m" | "12m" | string; // string = "Q1-2026" etc.

const PRESET_PERIODS = [
  { key: "1m", label: "Last Month" },
  { key: "3m", label: "Last 3 Months" },
  { key: "6m", label: "Last 6 Months" },
  { key: "12m", label: "Last 12 Months" },
];

function getQuarterOptions(entries: MonthlyEntry[]): Array<{ key: string; label: string }> {
  const seen = new Set<string>();
  const result: Array<{ key: string; label: string }> = [];
  for (const e of entries) {
    const [y, m] = e.id.split("-").map(Number);
    const q = Math.ceil(m / 3);
    const key = `Q${q}-${y}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ key, label: `Q${q} ${y} (${quarterLabel(q, y)})` });
    }
  }
  return result.slice(0, 8);
}

function quarterLabel(q: number, year: number): string {
  const months = [
    ["Jan", "Feb", "Mar"],
    ["Apr", "May", "Jun"],
    ["Jul", "Aug", "Sep"],
    ["Oct", "Nov", "Dec"],
  ];
  return `${months[q - 1][0]}–${months[q - 1][2]} ${year}`;
}

function filterEntries(entries: MonthlyEntry[], periodKey: PeriodKey): MonthlyEntry[] {
  const sorted = [...entries].sort((a, b) => b.id.localeCompare(a.id));

  if (periodKey === "1m") return sorted.slice(0, 1);
  if (periodKey === "3m") return sorted.slice(0, 3);
  if (periodKey === "6m") return sorted.slice(0, 6);
  if (periodKey === "12m") return sorted.slice(0, 12);

  // Quarter format: "Q2-2026"
  const match = periodKey.match(/^Q(\d)-(\d{4})$/);
  if (match) {
    const q = parseInt(match[1]);
    const year = parseInt(match[2]);
    const startM = (q - 1) * 3 + 1;
    const endM = q * 3;
    return sorted.filter((e) => {
      const [y, m] = e.id.split("-").map(Number);
      return y === year && m >= startM && m <= endM;
    });
  }

  return sorted.slice(0, 3);
}

function periodLabelFor(key: PeriodKey, entries: MonthlyEntry[]): string {
  const preset = PRESET_PERIODS.find((p) => p.key === key);
  if (preset) {
    const filtered = filterEntries(entries, key);
    if (filtered.length === 0) return preset.label;
    if (filtered.length === 1) return getMonthLabel(filtered[0].id);
    return `${getMonthLabel(filtered[filtered.length - 1].id)} – ${getMonthLabel(filtered[0].id)}`;
  }
  const q = getQuarterOptions(entries).find((o) => o.key === key);
  return q?.label ?? key;
}

// ─── Data serialization ───────────────────────────────────────────────────

function toRupees(paise: number): number {
  return Math.round(paise / 100);
}

function serializeEntry(entry: MonthlyEntry): MonthSnapshot {
  const { income, expenses, savings, summary } = entry;

  const byCategory: Record<string, number> = {};
  for (const item of expenses.items) {
    const cat = item.category ?? "other";
    byCategory[cat] = (byCategory[cat] ?? 0) + toRupees(item.actualAmount);
  }

  return {
    monthId: entry.id,
    monthLabel: getMonthLabel(entry.id),
    income: {
      salary: toRupees(income.salary),
      bonusOldBalance: toRupees(income.bonusOldBalance),
      freelance: toRupees(income.freelanceTotal),
      interest: toRupees(income.interest),
      dividend: toRupees(income.dividend),
      businessIncome: toRupees(income.businessIncome),
      passiveIncome: toRupees(income.passiveIncome),
      total: toRupees(summary.totalIncome),
    },
    expenses: {
      total: toRupees(expenses.totalExpenses),
      freelanceExpenses: toRupees(expenses.totalFreelanceExpenses),
      combinedTotal: toRupees(summary.totalExpenses),
      byCategory,
      items: expenses.items.map((i) => ({
        label: i.label,
        amount: toRupees(i.actualAmount),
        category: i.category,
      })),
    },
    savings: {
      fromSalary: toRupees(savings.totalFromSalary),
      fromFreelance: toRupees(savings.totalFromFreelance),
      total: toRupees(summary.totalSavings),
      items: savings.fromSalary.map((i) => ({
        label: i.label,
        amount: toRupees(i.actualAmount),
        category: i.category,
      })),
    },
    summary: {
      savingsRate: Math.round(summary.savingsRate),
      netBalance: toRupees(summary.netBalance),
      balanceRemainingFromSalary: toRupees(summary.balanceRemainingFromSalary),
      balanceRemainingFromFreelance: toRupees(summary.balanceRemainingFromFreelance),
    },
  };
}

// ─── Markdown renderer ────────────────────────────────────────────────────

function MarkdownReport({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let keyIdx = 0;

  const flushList = () => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`ul-${keyIdx++}`} className="list-disc list-inside space-y-1 text-sm text-foreground/90 my-2 pl-2">
          {listBuffer.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inlineFormat(item) }} />
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("### ")) {
      flushList();
      elements.push(
        <h3 key={keyIdx++} className="text-base font-bold mt-5 mb-2 text-primary">
          {trimmed.slice(4)}
        </h3>
      );
    } else if (trimmed.startsWith("## ")) {
      flushList();
      elements.push(
        <h2 key={keyIdx++} className="text-lg font-bold mt-6 mb-2 text-foreground border-b border-border pb-1">
          {trimmed.slice(3)}
        </h2>
      );
    } else if (trimmed.startsWith("# ")) {
      flushList();
      elements.push(
        <h1 key={keyIdx++} className="text-xl font-bold mt-4 mb-3 text-foreground">
          {trimmed.slice(2)}
        </h1>
      );
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      listBuffer.push(trimmed.slice(2));
    } else if (trimmed.startsWith("---")) {
      flushList();
      elements.push(<hr key={keyIdx++} className="border-border my-4" />);
    } else if (trimmed === "") {
      flushList();
      elements.push(<div key={keyIdx++} className="h-2" />);
    } else {
      flushList();
      elements.push(
        <p
          key={keyIdx++}
          className="text-sm text-foreground/90 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: inlineFormat(trimmed) }}
        />
      );
    }
  }
  flushList();

  return <div className="space-y-0.5">{elements}</div>;
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="bg-muted px-1 rounded text-xs">$1</code>');
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const { entries, isLoading: dbLoading } = useMonthHistory();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("3m");
  const [showQuarters, setShowQuarters] = useState(false);
  const [report, setReport] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);

  const quarterOptions = getQuarterOptions(entries);
  const selectedEntries = filterEntries(entries, selectedPeriod);
  const currentPeriodLabel = periodLabelFor(selectedPeriod, entries);

  const handleGenerate = async () => {
    if (selectedEntries.length === 0) {
      setError("No data found for the selected period. Please add monthly entries first.");
      return;
    }

    setReport("");
    setError("");
    setGenerating(true);

    try {
      const payload = {
        period: selectedPeriod,
        periodLabel: currentPeriodLabel,
        months: selectedEntries.map(serializeEntry),
      };

      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        setError(text || "Failed to generate report.");
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setReport(accumulated);
        // Scroll to bottom as content streams in
        setTimeout(() => {
          reportRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 50);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error generating report.");
    } finally {
      setGenerating(false);
    }
  };

  if (dbLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-2 pt-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold">AI Insights</h1>
      </div>

      {/* Period selector */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-medium text-muted-foreground">Select Period</p>

        {/* Preset buttons */}
        <div className="grid grid-cols-2 gap-2">
          {PRESET_PERIODS.map((p) => {
            const count = filterEntries(entries, p.key).length;
            return (
              <button
                key={p.key}
                onClick={() => { setSelectedPeriod(p.key); setShowQuarters(false); }}
                className={`rounded-xl px-3 py-2.5 text-sm font-medium text-left transition-all border ${
                  selectedPeriod === p.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 text-foreground border-border hover:bg-muted/60"
                }`}
              >
                {p.label}
                <span className={`block text-xs mt-0.5 ${selectedPeriod === p.key ? "opacity-70" : "text-muted-foreground"}`}>
                  {count} {count === 1 ? "month" : "months"} of data
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom quarter toggle */}
        {quarterOptions.length > 0 && (
          <div>
            <button
              onClick={() => setShowQuarters((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showQuarters ? "rotate-180" : ""}`} />
              Custom Quarter
            </button>
            {showQuarters && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {quarterOptions.map((q) => (
                  <button
                    key={q.key}
                    onClick={() => setSelectedPeriod(q.key)}
                    className={`rounded-xl px-3 py-2 text-xs font-medium transition-all border ${
                      selectedPeriod === q.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/30 text-foreground border-border hover:bg-muted/60"
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selected period summary */}
        {selectedEntries.length > 0 && (
          <div className="rounded-xl bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">{currentPeriodLabel}</p>
            <div className="flex gap-4">
              <span>
                Avg income:{" "}
                <span className="text-foreground font-medium">
                  {formatINRCompact(
                    selectedEntries.reduce((s, e) => s + e.summary.totalIncome, 0) /
                      selectedEntries.length
                  )}
                </span>
              </span>
              <span>
                Avg savings rate:{" "}
                <span className="text-foreground font-medium">
                  {Math.round(
                    selectedEntries.reduce((s, e) => s + e.summary.savingsRate, 0) /
                      selectedEntries.length
                  )}%
                </span>
              </span>
            </div>
          </div>
        )}

        {selectedEntries.length === 0 && (
          <p className="text-xs text-muted-foreground italic">
            No entries found for this period. Add monthly entries to get insights.
          </p>
        )}

        <Button
          onClick={handleGenerate}
          disabled={generating || selectedEntries.length === 0}
          className="w-full gap-2"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating report…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate AI Report
            </>
          )}
        </Button>
      </div>

      {/* Freelance Trend — always visible */}
      <FreelanceTrend entries={entries} />

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Report */}
      {(report || generating) && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Financial Report · {currentPeriodLabel}</span>
            {generating && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground ml-auto" />}
          </div>
          {report && <MarkdownReport text={report} />}
          {generating && !report && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing your financial data…
            </div>
          )}
          <div ref={reportRef} />
        </div>
      )}
    </div>
  );
}
