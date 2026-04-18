"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import type { MonthlyEntry, IncomeSection, LoanRecord } from "@/types/finance";
import { CurrencyInput } from "../CurrencyInput";
import { BankImportSheet } from "../BankImportSheet";
import { formatINR, formatINRCompact, generateId } from "@/lib/utils";
import { getSettings, saveSettings, getAllMonthEntries } from "@/lib/db/queries";
import { ChevronDown, ChevronUp, FileUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

async function computeLoanBalances(loans: LoanRecord[]): Promise<Record<string, number>> {
  const entries = await getAllMonthEntries();
  const repaidMap: Record<string, number> = {};
  for (const entry of entries) {
    for (const r of entry.expenses?.loanRepayments ?? []) {
      repaidMap[r.loanId] = (repaidMap[r.loanId] ?? 0) + r.amount;
    }
  }
  const balances: Record<string, number> = {};
  for (const loan of loans) {
    balances[loan.id] = Math.max(0, loan.amountBorrowed - (repaidMap[loan.id] ?? 0));
  }
  return balances;
}

export function Step1_Income({ data, onUpdate }: Props) {
  const [showOther, setShowOther] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showLoans, setShowLoans] = useState(false);

  // Loan state
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [loanBalances, setLoanBalances] = useState<Record<string, number>>({});
  const [newLenderName, setNewLenderName] = useState("");
  const [newLoanAmount, setNewLoanAmount] = useState(0);
  const [newLoanDate, setNewLoanDate] = useState(new Date().toISOString().slice(0, 10));
  const [newLoanNote, setNewLoanNote] = useState("");

  const income = data.income ?? {} as IncomeSection;

  const balanceManuallyEdited = useRef(
    (income.salaryAccountBalance ?? 0) > 0 &&
    (income.salaryAccountBalance ?? 0) !== (income.salary ?? 0) + (income.bonusOldBalance ?? 0)
  );

  const refreshLoans = useCallback(async () => {
    const settings = await getSettings();
    const ls = settings.loans ?? [];
    setLoans(ls);
    const balances = await computeLoanBalances(ls);
    setLoanBalances(balances);
  }, []);

  useEffect(() => {
    refreshLoans();
  }, [refreshLoans]);

  const handleAddLoan = async () => {
    if (!newLenderName.trim() || newLoanAmount <= 0) return;
    const settings = await getSettings();
    const newLoan: LoanRecord = {
      id: generateId(),
      lenderName: newLenderName.trim(),
      amountBorrowed: newLoanAmount,
      dateBorrowed: newLoanDate,
      notes: newLoanNote.trim() || undefined,
    };
    const updated = { ...settings, loans: [...(settings.loans ?? []), newLoan] };
    await saveSettings(updated);
    setNewLenderName("");
    setNewLoanAmount(0);
    setNewLoanDate(new Date().toISOString().slice(0, 10));
    setNewLoanNote("");
    await refreshLoans();
  };

  const handleDeleteLoan = async (id: string) => {
    const settings = await getSettings();
    const updated = { ...settings, loans: (settings.loans ?? []).filter((l) => l.id !== id) };
    await saveSettings(updated);
    await refreshLoans();
  };

  const totalIncome =
    (income.salary ?? 0) +
    (income.bonusOldBalance ?? 0) +
    (income.interest ?? 0) +
    (income.dividend ?? 0) +
    (income.businessIncome ?? 0) +
    (income.passiveIncome ?? 0);

  const totalOutstanding = loans.reduce((s, l) => s + (loanBalances[l.id] ?? 0), 0);
  const activeLoans = loans.filter((l) => (loanBalances[l.id] ?? 0) > 0);

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

      {/* Loan Borrowings accordion */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setShowLoans(!showLoans)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/30 transition-colors"
        >
          <span>Loan Borrowings</span>
          <div className="flex items-center gap-2">
            {activeLoans.length > 0 && (
              <span className="text-xs text-orange-500 font-semibold">
                {activeLoans.length} active · {formatINRCompact(totalOutstanding)} due
              </span>
            )}
            {loans.length === 0 && (
              <span className="text-xs text-muted-foreground">No loans</span>
            )}
            {showLoans ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showLoans && (
          <div className="border-t border-border/50">
            {/* Loan list */}
            {loans.length > 0 && (
              <div className="divide-y divide-border/40">
                {loans.map((loan) => {
                  const balance = loanBalances[loan.id] ?? loan.amountBorrowed;
                  const repaid = loan.amountBorrowed - balance;
                  const repaidPct = loan.amountBorrowed > 0 ? (repaid / loan.amountBorrowed) * 100 : 0;
                  const isPaid = balance === 0;
                  return (
                    <div key={loan.id} className="px-4 py-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{loan.lenderName}</p>
                          <p className="text-xs text-muted-foreground">
                            Borrowed {formatINR(loan.amountBorrowed)} · {loan.dateBorrowed}
                          </p>
                          {loan.notes && (
                            <p className="text-xs text-muted-foreground italic">{loan.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn(
                            "text-xs font-semibold px-2 py-0.5 rounded-full",
                            isPaid
                              ? "bg-green-100 text-green-700"
                              : balance < loan.amountBorrowed * 0.25
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-orange-100 text-orange-700"
                          )}>
                            {isPaid ? "Paid off" : `${formatINRCompact(balance)} due`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteLoan(loan.id)}
                            className="p-1 text-muted-foreground/50 hover:text-destructive transition-colors"
                            aria-label="Delete loan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {/* Progress bar */}
                      {loan.amountBorrowed > 0 && (
                        <div className="space-y-0.5">
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                isPaid ? "bg-green-500" : "bg-orange-400"
                              )}
                              style={{ width: `${repaidPct}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatINRCompact(repaid)} repaid of {formatINRCompact(loan.amountBorrowed)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add new loan form */}
            <div className="px-4 py-4 space-y-3 border-t border-border/40 bg-muted/20">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Loan</p>
              <input
                type="text"
                value={newLenderName}
                onChange={(e) => setNewLenderName(e.target.value)}
                placeholder="Lender name (e.g. SBI, Friend Ravi)"
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Amount Borrowed</label>
                  <CurrencyInput
                    value={newLoanAmount}
                    onChange={setNewLoanAmount}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Date Borrowed</label>
                  <input
                    type="date"
                    value={newLoanDate}
                    onChange={(e) => setNewLoanDate(e.target.value)}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <input
                type="text"
                value={newLoanNote}
                onChange={(e) => setNewLoanNote(e.target.value)}
                placeholder="Notes (optional)"
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                type="button"
                onClick={handleAddLoan}
                disabled={!newLenderName.trim() || newLoanAmount <= 0}
                className="w-full"
                variant="outline"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Loan
              </Button>
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
