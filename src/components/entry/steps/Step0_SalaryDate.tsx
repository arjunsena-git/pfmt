"use client";
import React from "react";
import type { MonthlyEntry } from "@/types/finance";
import { getMonthId, getMonthLabel, getRecentMonthIds } from "@/lib/utils";

interface Props {
  data: Partial<MonthlyEntry>;
  onUpdate: (patch: Partial<MonthlyEntry>) => void;
}

export function Step0_SalaryDate({ data, onUpdate }: Props) {
  const selectedMonthId = data.id ?? getMonthId();
  const salaryDate = data.income?.salaryDate ?? "";

  const handleMonthChange = (monthId: string) => {
    onUpdate({ id: monthId });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({
      income: { ...data.income, salaryDate: e.target.value } as typeof data.income,
    });
  };

  const futureMonths = Array.from({ length: 3 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() + i + 1);
    return getMonthId(d);
  });
  const recentMonths = [...futureMonths, ...getRecentMonthIds(18)];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Which month are you entering?</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Select the month and the date your salary was credited.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Month</label>
        <select
          value={selectedMonthId}
          onChange={(e) => handleMonthChange(e.target.value)}
          className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {recentMonths.map((id) => (
            <option key={id} value={id}>
              {getMonthLabel(id)}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Salary Credit Date</label>
        <input
          type="date"
          value={salaryDate}
          onChange={handleDateChange}
          className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          The date your salary landed in your account
        </p>
      </div>

      <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">Selected: {getMonthLabel(selectedMonthId)}</p>
        <p>Money credited after 27th of previous month through this month</p>
      </div>
    </div>
  );
}
