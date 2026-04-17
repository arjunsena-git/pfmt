"use client";
import React, { useState } from "react";
import type { MonthlyEntry, IncomeSection, FreelanceLineItem, FreelanceExpenseItem, SavingsSection, FreelanceSavingsItem } from "@/types/finance";
import { CurrencyInput } from "../CurrencyInput";
import { formatINR, generateId } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  data: Partial<MonthlyEntry>;
  onUpdate: (patch: Partial<MonthlyEntry>) => void;
  defaultSources?: string[];
}

export function Step4_Freelance({ data, onUpdate, defaultSources = [] }: Props) {
  const [hasFreelance, setHasFreelance] = useState(
    (data.income?.freelanceTotal ?? 0) > 0 || (data.income?.freelanceItems?.length ?? 0) > 0
  );

  const income = data.income ?? {} as IncomeSection;
  const savings = data.savings ?? { fromSalary: [], fromFreelance: [], totalFromSalary: 0, totalFromFreelance: 0, totalSavings: 0 };
  const expenses = data.expenses ?? { items: [], freelanceExpenses: [], totalExpenses: 0, totalFreelanceExpenses: 0 };

  const lineItems = income.freelanceItems ?? [];
  const freelanceExpenses = expenses.freelanceExpenses ?? [];
  const freelanceSavings = savings.fromFreelance ?? [];

  const recomputeFreelanceTotal = (items: FreelanceLineItem[]) =>
    items.reduce((sum, i) => sum + i.amount, 0);

  const updateLineItem = (id: string, field: "source" | "amount", value: string | number) => {
    const items = lineItems.map((i) => i.id === id ? { ...i, [field]: value } : i);
    const total = recomputeFreelanceTotal(items);
    onUpdate({ income: { ...income, freelanceItems: items, freelanceTotal: total } as IncomeSection });
  };

  const addLineItem = () => {
    const item: FreelanceLineItem = { id: generateId(), source: "", amount: 0 };
    const items = [...lineItems, item];
    onUpdate({ income: { ...income, freelanceItems: items } as IncomeSection });
  };

  const removeLineItem = (id: string) => {
    const items = lineItems.filter((i) => i.id !== id);
    const total = recomputeFreelanceTotal(items);
    onUpdate({ income: { ...income, freelanceItems: items, freelanceTotal: total } as IncomeSection });
  };

  const updateExpense = (id: string, field: "label" | "amount", value: string | number) => {
    const fe = freelanceExpenses.map((i) => i.id === id ? { ...i, [field]: value } : i);
    const total = fe.reduce((sum, i) => sum + i.amount, 0);
    onUpdate({ expenses: { ...expenses, freelanceExpenses: fe, totalFreelanceExpenses: total } as typeof expenses });
  };

  const addExpense = () => {
    const item: FreelanceExpenseItem = { id: generateId(), label: "", amount: 0 };
    onUpdate({ expenses: { ...expenses, freelanceExpenses: [...freelanceExpenses, item] } as typeof expenses });
  };

  const removeExpense = (id: string) => {
    const fe = freelanceExpenses.filter((i) => i.id !== id);
    const total = fe.reduce((sum, i) => sum + i.amount, 0);
    onUpdate({ expenses: { ...expenses, freelanceExpenses: fe, totalFreelanceExpenses: total } as typeof expenses });
  };

  const updateSavings = (id: string, field: "label" | "amount", value: string | number) => {
    const fs = freelanceSavings.map((i) => i.id === id ? { ...i, [field]: value } : i);
    const total = fs.reduce((sum, i) => sum + i.amount, 0);
    onUpdate({ savings: { ...savings, fromFreelance: fs, totalFromFreelance: total, totalSavings: savings.totalFromSalary + total } as SavingsSection });
  };

  const addSavings = () => {
    const item: FreelanceSavingsItem = { id: generateId(), label: "", amount: 0 };
    onUpdate({ savings: { ...savings, fromFreelance: [...freelanceSavings, item] } as SavingsSection });
  };

  const removeSavings = (id: string) => {
    const fs = freelanceSavings.filter((i) => i.id !== id);
    const total = fs.reduce((sum, i) => sum + i.amount, 0);
    onUpdate({ savings: { ...savings, fromFreelance: fs, totalFromFreelance: total, totalSavings: savings.totalFromSalary + total } as SavingsSection });
  };

  const freelanceNet = (income.freelanceTotal ?? 0) -
    freelanceExpenses.reduce((s, i) => s + i.amount, 0) -
    freelanceSavings.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Freelance</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Track side income separately.
        </p>
      </div>

      {/* Toggle */}
      <div
        onClick={() => setHasFreelance(!hasFreelance)}
        className={`rounded-xl border-2 p-4 cursor-pointer transition-colors flex items-center gap-3 ${
          hasFreelance ? "border-primary bg-primary/5" : "border-border bg-muted/20"
        }`}
      >
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
          hasFreelance ? "border-primary bg-primary" : "border-muted-foreground"
        }`}>
          {hasFreelance && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
        <span className="text-sm font-medium">I received freelance income this month</span>
      </div>

      {hasFreelance && (
        <>
          {/* Income Sources */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2 bg-muted/40 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Income Sources</span>
              <Button type="button" onClick={addLineItem} size="sm" variant="ghost" className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
            <div className="p-4 space-y-3">
              {lineItems.map((item) => (
                <div key={item.id} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={item.source}
                    onChange={(e) => updateLineItem(item.id, "source", e.target.value)}
                    placeholder="Source (e.g. Ram support)"
                    list="freelance-sources"
                    className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <datalist id="freelance-sources">
                    {defaultSources.map((s) => <option key={s} value={s} />)}
                  </datalist>
                  <div className="w-32 shrink-0">
                    <CurrencyInput
                      value={item.amount}
                      onChange={(v) => updateLineItem(item.id, "amount", v)}
                    />
                  </div>
                  <button type="button" onClick={() => removeLineItem(item.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {lineItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  No sources yet. Tap Add.
                </p>
              )}
            </div>
          </div>

          {/* Freelance Expenses */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2 bg-muted/40 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Freelance Expenses</span>
              <Button type="button" onClick={addExpense} size="sm" variant="ghost" className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
            <div className="p-4 space-y-3">
              {freelanceExpenses.map((item) => (
                <div key={item.id} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateExpense(item.id, "label", e.target.value)}
                    placeholder="e.g. Nanny loan"
                    className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="w-32 shrink-0">
                    <CurrencyInput value={item.amount} onChange={(v) => updateExpense(item.id, "amount", v)} />
                  </div>
                  <button type="button" onClick={() => removeExpense(item.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {freelanceExpenses.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">No expenses from freelance</p>
              )}
            </div>
          </div>

          {/* Freelance Savings */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-2 bg-muted/40 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Savings from Freelance</span>
              <Button type="button" onClick={addSavings} size="sm" variant="ghost" className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> Add
              </Button>
            </div>
            <div className="p-4 space-y-3">
              {freelanceSavings.map((item) => (
                <div key={item.id} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateSavings(item.id, "label", e.target.value)}
                    placeholder="e.g. Parked in Equitas SB"
                    className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="w-32 shrink-0">
                    <CurrencyInput value={item.amount} onChange={(v) => updateSavings(item.id, "amount", v)} />
                  </div>
                  <button type="button" onClick={() => removeSavings(item.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <div className="bg-primary/5 rounded-xl p-4 flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Freelance Total</span>
              <span className="text-lg font-bold text-primary">{formatINR(income.freelanceTotal ?? 0)}</span>
            </div>
            <div className="bg-muted/30 rounded-xl p-4 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Net (after expenses & savings)</span>
              <span className={`font-semibold ${freelanceNet >= 0 ? "text-green-600" : "text-destructive"}`}>
                {formatINR(freelanceNet)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
