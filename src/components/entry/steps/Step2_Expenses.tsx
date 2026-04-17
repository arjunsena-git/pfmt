"use client";
import React, { useState, useEffect } from "react";
import type { MonthlyEntry, ExpensesSection, ExpenseItem, CreditCardEMI } from "@/types/finance";
import { OverrideRow } from "../OverrideRow";
import { CurrencyInput } from "../CurrencyInput";
import { formatINR, formatINRCompact, generateId, getMonthId } from "@/lib/utils";
import { getSettings } from "@/lib/db/queries";
import { emiStats } from "@/components/settings/CreditCardEMIs";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  data: Partial<MonthlyEntry>;
  onUpdate: (patch: Partial<MonthlyEntry>) => void;
}

function activeEmiNote(emis: CreditCardEMI[], bank: "axis" | "icici"): string | undefined {
  const active = emis.filter((e) => e.bank === bank && emiStats(e).isActive);
  if (active.length === 0) return undefined;
  const total = active.reduce((s, e) => s + e.monthlyInstalment, 0);
  const parts = active.map((e) => `${e.label}: ${formatINRCompact(e.monthlyInstalment)}`).join(" + ");
  return `EMIs ${formatINR(total)}/mo — ${parts}`;
}

export function Step2_Expenses({ data, onUpdate }: Props) {
  const [newLabel, setNewLabel] = useState("");
  const [ccEmis, setCcEmis] = useState<CreditCardEMI[]>([]);

  useEffect(() => {
    getSettings().then((s) => setCcEmis(s.creditCardEMIs ?? []));
  }, []);
  const expenses = data.expenses ?? { items: [], freelanceExpenses: [], totalExpenses: 0, totalFreelanceExpenses: 0 };

  const updateItem = (id: string, paise: number) => {
    const items = expenses.items.map((item) =>
      item.id === id
        ? { ...item, actualAmount: paise, isOverridden: paise !== item.defaultAmount }
        : item
    );
    const total = items.reduce((sum, i) => sum + i.actualAmount, 0);
    onUpdate({
      expenses: { ...expenses, items, totalExpenses: total } as ExpensesSection,
    });
  };

  const togglePaid = (id: string) => {
    const items = expenses.items.map((item) =>
      item.id === id ? { ...item, isPaid: !item.isPaid } : item
    );
    onUpdate({ expenses: { ...expenses, items } as ExpensesSection });
  };

  const addCustom = () => {
    if (!newLabel.trim()) return;
    const newItem: ExpenseItem = {
      id: generateId(),
      label: newLabel.trim(),
      defaultAmount: 0,
      actualAmount: 0,
      isOverridden: false,
      frequency: "variable",
      category: "other",
    };
    const items = [...expenses.items, newItem];
    onUpdate({ expenses: { ...expenses, items } as ExpensesSection });
    setNewLabel("");
  };

  const removeCustom = (id: string) => {
    const items = expenses.items.filter((i) => i.id !== id);
    const total = items.reduce((sum, i) => sum + i.actualAmount, 0);
    onUpdate({ expenses: { ...expenses, items, totalExpenses: total } as ExpensesSection });
  };

  const totalExpenses = expenses.items.reduce((sum, i) => sum + i.actualAmount, 0);

  return (
    <div className="space-y-6 px-4 sm:px-6 pb-6">
      <div>
        <h2 className="text-xl font-bold">Expenses</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Defaults are pre-filled. Override any amount for this month.
        </p>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-3 sm:px-4 py-2 bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recurring Expenses
        </div>
        <div className="px-3 sm:px-4">
          {expenses.items.map((item) => {
            const labelLower = item.label.toLowerCase();
            const emiNote =
              item.category === "creditcard" && labelLower.includes("axis")
                ? activeEmiNote(ccEmis, "axis")
                : item.category === "creditcard" && labelLower.includes("icici")
                ? activeEmiNote(ccEmis, "icici")
                : undefined;
            const subLabel =
              item.frequency === "annual"
                ? "Annual (÷12 monthly)"
                : emiNote ?? undefined;
            return (
              <OverrideRow
                key={item.id}
                id={item.id}
                label={item.label}
                defaultAmount={item.defaultAmount}
                actualAmount={item.actualAmount}
                isOverridden={item.isOverridden}
                onChange={(v) => updateItem(item.id, v)}
                isPaid={item.isPaid}
                onTogglePaid={() => togglePaid(item.id)}
                onRemove={() => removeCustom(item.id)}
                subLabel={subLabel}
              />
            );
          })}
        </div>
      </div>

      {/* Add custom expense */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
          placeholder="Add custom expense…"
          className="flex-1 h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="button" onClick={addCustom} size="icon" variant="outline">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Total */}
      <div className="bg-destructive/5 rounded-xl p-4 flex justify-between items-center">
        <span className="text-sm font-medium text-muted-foreground">Total Expenses</span>
        <span className="text-lg font-bold text-destructive">{formatINR(totalExpenses)}</span>
      </div>
    </div>
  );
}
