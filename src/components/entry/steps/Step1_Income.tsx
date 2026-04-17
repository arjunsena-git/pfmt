"use client";
import React, { useState, useRef } from "react";
import type { MonthlyEntry, IncomeSection } from "@/types/finance";
import { CurrencyInput } from "../CurrencyInput";
import { BankImportSheet } from "../BankImportSheet";
import { formatINR } from "@/lib/utils";
import { ChevronDown, ChevronUp, FileUp } from "lucide-react";

interface Props {
  data: Partial<MonthlyEntry>;
  onUpdate: (patch: Partial<MonthlyEntry>) => void;
}

function updateIncome(data: Partial<MonthlyEntry>, patch: Partial<IncomeSection>): Partial<MonthlyEntry> {
  return {
    ...data,
    income: { ...(data.income ?? {} as IncomeSection), ...patch } as IncomeSection,
  };
}

export function Step1_Income({ data, onUpdate }: Props) {
  const [showOther, setShowOther] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const income = data.income ?? {} as IncomeSection;

  // Track whether the user has manually edited the salary account balance.
  // If not, keep it in sync with salary + bonusOldBalance automatically.
  const balanceManuallyEdited = useRef(
    (income.salaryAccountBalance ?? 0) > 0 &&
    (income.salaryAccountBalance ?? 0) !== (income.salary ?? 0) + (income.bonusOldBalance ?? 0)
  );

  const totalIncome =
    (income.salary ?? 0) +
    (income.bonusOldBalance ?? 0) +
    (income.interest ?? 0) +
    (income.dividend ?? 0) +
    (income.businessIncome ?? 0) +
    (income.passiveIncome ?? 0);

  return (
    <div className="space-y-6">
      {showImport && (
        <BankImportSheet
          income={income}
          onApply={(patch) => onUpdate(updateIncome(data, patch))}
          onClose={() => setShowImport(false)}
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Income</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Enter your salary and other income sources.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/30 rounded-xl px-3 py-2 hover:bg-primary/5 transition-colors mt-1"
        >
          <FileUp className="w-3.5 h-3.5" />
          Import Bank PDF
        </button>
      </div>

      {/* Salary */}
      <div className="space-y-2">
        <label className="text-sm font-semibold">Salary (Net)</label>
        <CurrencyInput
          value={income.salary ?? 0}
          onChange={(v) => {
            const patch: Partial<IncomeSection> = { salary: v };
            if (!balanceManuallyEdited.current) {
              patch.salaryAccountBalance = v + (income.bonusOldBalance ?? 0);
            }
            onUpdate(updateIncome(data, patch));
          }}
          size="large"
          placeholder="0.00"
        />
      </div>

      {/* Salary Account Balance */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Salary Account Balance</label>
        <p className="text-xs text-muted-foreground">Running balance in your salary account (auto-filled from Salary + Old Balance)</p>
        <CurrencyInput
          value={income.salaryAccountBalance ?? 0}
          onChange={(v) => {
            balanceManuallyEdited.current = true;
            onUpdate(updateIncome(data, { salaryAccountBalance: v }));
          }}
        />
      </div>

      {/* Other Income accordion */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setShowOther(!showOther)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
        >
          <span>Other Income</span>
          <div className="flex items-center gap-2">
            {(income.bonusOldBalance || income.interest || income.dividend || income.businessIncome || income.passiveIncome) ? (
              <span className="text-xs text-primary font-semibold">
                + {formatINR(
                  (income.bonusOldBalance ?? 0) +
                  (income.interest ?? 0) +
                  (income.dividend ?? 0) +
                  (income.businessIncome ?? 0) +
                  (income.passiveIncome ?? 0)
                )}
              </span>
            ) : null}
            {showOther ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showOther && (
          <div className="px-4 pb-4 space-y-4 border-t border-border/50">
            <div className="pt-4 space-y-2">
              <label className="text-sm font-medium">Bonus / Old Balance</label>
              <CurrencyInput
                value={income.bonusOldBalance ?? 0}
                onChange={(v) => {
                  const patch: Partial<IncomeSection> = { bonusOldBalance: v };
                  if (!balanceManuallyEdited.current) {
                    patch.salaryAccountBalance = (income.salary ?? 0) + v;
                  }
                  onUpdate(updateIncome(data, patch));
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Interest</label>
              <CurrencyInput
                value={income.interest ?? 0}
                onChange={(v) => onUpdate(updateIncome(data, { interest: v }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Dividend</label>
              <CurrencyInput
                value={income.dividend ?? 0}
                onChange={(v) => onUpdate(updateIncome(data, { dividend: v }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Business Income</label>
              <CurrencyInput
                value={income.businessIncome ?? 0}
                onChange={(v) => onUpdate(updateIncome(data, { businessIncome: v }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Passive Income</label>
              <CurrencyInput
                value={income.passiveIncome ?? 0}
                onChange={(v) => onUpdate(updateIncome(data, { passiveIncome: v }))}
              />
            </div>
          </div>
        )}
      </div>

      {/* Running total */}
      <div className="bg-primary/5 rounded-xl p-4 flex justify-between items-center">
        <span className="text-sm font-medium text-muted-foreground">Salary Income Total</span>
        <span className="text-lg font-bold text-primary">{formatINR(totalIncome)}</span>
      </div>
    </div>
  );
}
