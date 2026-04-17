"use client";
import React from "react";
import Link from "next/link";
import { useMonthHistory } from "@/hooks/useMonthHistory";
import { formatINR, getMonthLabel, savingsRateColor } from "@/lib/utils";
import { deleteMonthEntry } from "@/lib/db/queries";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, PlusCircle, FileSpreadsheet } from "lucide-react";

export default function HistoryPage() {
  const { entries, isLoading, reload } = useMonthHistory();

  const handleDelete = async (monthId: string) => {
    if (!confirm(`Delete entry for ${getMonthLabel(monthId)}? This cannot be undone.`)) return;
    await deleteMonthEntry(monthId);
    reload();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold">History</h1>
        <Link href="/entry">
          <Button size="sm" className="gap-1.5 h-9">
            <PlusCircle className="w-4 h-4" />
            New
          </Button>
        </Link>
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="text-5xl">📋</div>
          <p className="text-muted-foreground">No entries yet.</p>
          <Link href="/entry">
            <Button>Start your first entry</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{getMonthLabel(entry.id)}</h3>
                  <p className={`text-sm font-medium ${savingsRateColor(entry.summary.savingsRate)}`}>
                    {entry.summary.savingsRate.toFixed(1)}% savings rate
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link href={`/entry/${entry.id}`}>
                    <Button size="icon" variant="outline" className="h-8 w-8">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Income</p>
                  <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {formatINR(entry.summary.totalIncome)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expenses</p>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {formatINR(entry.summary.totalExpenses)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Savings</p>
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">
                    {formatINR(entry.summary.totalSavings)}
                  </p>
                </div>
              </div>

              {entry.syncStatus.sheetsSynced && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-green-600">
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Synced to Google Sheets</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
