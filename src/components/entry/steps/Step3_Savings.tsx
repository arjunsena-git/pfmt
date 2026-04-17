"use client";
import React, { useState } from "react";
import type { MonthlyEntry, SavingsSection, SavingsItem } from "@/types/finance";
import { OverrideRow } from "../OverrideRow";
import { formatINR, generateId } from "@/lib/utils";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  data: Partial<MonthlyEntry>;
  onUpdate: (patch: Partial<MonthlyEntry>) => void;
}

export function Step3_Savings({ data, onUpdate }: Props) {
  const [newLabel, setNewLabel] = useState("");
  const savings = data.savings ?? { fromSalary: [], fromFreelance: [], totalFromSalary: 0, totalFromFreelance: 0, totalSavings: 0 };

  const updateItem = (id: string, paise: number) => {
    const fromSalary = savings.fromSalary.map((item) =>
      item.id === id
        ? { ...item, actualAmount: paise, isOverridden: paise !== item.defaultAmount }
        : item
    );
    const total = fromSalary.reduce((sum, i) => sum + i.actualAmount, 0);
    onUpdate({
      savings: {
        ...savings,
        fromSalary,
        totalFromSalary: total,
        totalSavings: total + savings.totalFromFreelance,
      } as SavingsSection,
    });
  };

  const togglePaid = (id: string) => {
    const fromSalary = savings.fromSalary.map((item) =>
      item.id === id ? { ...item, isPaid: !item.isPaid } : item
    );
    onUpdate({ savings: { ...savings, fromSalary } as SavingsSection });
  };

  const addCustom = () => {
    if (!newLabel.trim()) return;
    const newItem: SavingsItem = {
      id: generateId(),
      label: newLabel.trim(),
      defaultAmount: 0,
      actualAmount: 0,
      isOverridden: false,
      category: "other",
    };
    const fromSalary = [...savings.fromSalary, newItem];
    onUpdate({ savings: { ...savings, fromSalary } as SavingsSection });
    setNewLabel("");
  };

  const removeCustom = (id: string) => {
    const fromSalary = savings.fromSalary.filter((i) => i.id !== id);
    const total = fromSalary.reduce((sum, i) => sum + i.actualAmount, 0);
    onUpdate({
      savings: {
        ...savings,
        fromSalary,
        totalFromSalary: total,
        totalSavings: total + savings.totalFromFreelance,
      } as SavingsSection,
    });
  };

  const totalSalary = savings.fromSalary.reduce((sum, i) => sum + i.actualAmount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Savings & Investments</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Defaults are pre-filled. Override for this month if needed.
        </p>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-2 bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          From Salary
        </div>
        <div className="px-4">
          {savings.fromSalary.map((item) => (
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
              subLabel={item.purpose}
            />
          ))}
        </div>
      </div>

      {/* Add custom */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCustom()}
          placeholder="Add custom investment…"
          className="flex-1 h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="button" onClick={addCustom} size="icon" variant="outline">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Total */}
      <div className="bg-green-500/5 rounded-xl p-4 flex justify-between items-center">
        <span className="text-sm font-medium text-muted-foreground">Total Savings (Salary)</span>
        <span className="text-lg font-bold text-green-600">{formatINR(totalSalary)}</span>
      </div>
    </div>
  );
}
