"use client";
import { useState, useEffect } from "react";
import type { MonthlyEntry, ExpensesSection, ExpenseItem, CreditCardEMI, LoanRecord, LoanRepaymentItem } from "@/types/finance";
import { OverrideRow } from "../OverrideRow";
import { CurrencyInput } from "../CurrencyInput";
import { formatINR, formatINRCompact, generateId } from "@/lib/utils";
import { getSettings } from "@/lib/db/queries";
import { emiStats } from "@/components/settings/CreditCardEMIs";
import { Plus, Trash2 } from "lucide-react";
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
  const [loans, setLoans] = useState<LoanRecord[]>([]);

  // New repayment form state
  const [selectedLoanId, setSelectedLoanId] = useState("");
  const [repaymentAmount, setRepaymentAmount] = useState(0);
  const [repaymentDate, setRepaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [repaymentNote, setRepaymentNote] = useState("");

  useEffect(() => {
    getSettings().then((s) => {
      setCcEmis(s.creditCardEMIs ?? []);
      const ls = s.loans ?? [];
      setLoans(ls);
      if (ls.length > 0 && !selectedLoanId) setSelectedLoanId(ls[0].id);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expenses = data.expenses ?? {
    items: [],
    freelanceExpenses: [],
    loanRepayments: [],
    totalExpenses: 0,
    totalFreelanceExpenses: 0,
    totalLoanRepayments: 0,
  };

  const updateItem = (id: string, paise: number) => {
    const items = expenses.items.map((item) =>
      item.id === id
        ? { ...item, actualAmount: paise, isOverridden: paise !== item.defaultAmount }
        : item
    );
    const loanTotal = (expenses.loanRepayments ?? []).reduce((s, r) => s + r.amount, 0);
    const total = items.reduce((sum, i) => sum + i.actualAmount, 0) + loanTotal;
    onUpdate({
      expenses: { ...expenses, items, totalExpenses: total } as ExpensesSection,
    });
  };

  const togglePaid = (id: string) => {
    const items = expenses.items.map((item) => {
      if (item.id !== id) return item;
      const nowPaid = !item.isPaid;
      return {
        ...item,
        isPaid: nowPaid,
        paidDate: nowPaid ? (item.paidDate ?? new Date().toISOString().slice(0, 10)) : undefined,
      };
    });
    onUpdate({ expenses: { ...expenses, items } as ExpensesSection });
  };

  const updateDate = (id: string, date: string) => {
    const items = expenses.items.map((item) =>
      item.id === id ? { ...item, paidDate: date || undefined } : item
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
    const loanTotal = (expenses.loanRepayments ?? []).reduce((s, r) => s + r.amount, 0);
    const total = items.reduce((sum, i) => sum + i.actualAmount, 0) + loanTotal;
    onUpdate({ expenses: { ...expenses, items, totalExpenses: total } as ExpensesSection });
  };

  // Loan repayment handlers
  const addRepayment = () => {
    if (!selectedLoanId || repaymentAmount <= 0) return;
    const loan = loans.find((l) => l.id === selectedLoanId);
    if (!loan) return;
    const newRepayment: LoanRepaymentItem = {
      id: generateId(),
      loanId: selectedLoanId,
      lenderName: loan.lenderName,
      amount: repaymentAmount,
      date: repaymentDate,
      note: repaymentNote.trim() || undefined,
    };
    const loanRepayments = [...(expenses.loanRepayments ?? []), newRepayment];
    const totalLoanRepayments = loanRepayments.reduce((s, r) => s + r.amount, 0);
    const itemsTotal = expenses.items.reduce((s, i) => s + i.actualAmount, 0);
    onUpdate({ expenses: { ...expenses, loanRepayments, totalLoanRepayments, totalExpenses: itemsTotal + totalLoanRepayments } as ExpensesSection });
    setRepaymentAmount(0);
    setRepaymentNote("");
  };

  const removeRepayment = (id: string) => {
    const loanRepayments = (expenses.loanRepayments ?? []).filter((r) => r.id !== id);
    const totalLoanRepayments = loanRepayments.reduce((s, r) => s + r.amount, 0);
    const itemsTotal = expenses.items.reduce((s, i) => s + i.actualAmount, 0);
    onUpdate({ expenses: { ...expenses, loanRepayments, totalLoanRepayments, totalExpenses: itemsTotal + totalLoanRepayments } as ExpensesSection });
  };

  const totalLoanRepayments = (expenses.loanRepayments ?? []).reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.items.reduce((sum, i) => sum + i.actualAmount, 0) + totalLoanRepayments;

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
                paidDate={item.paidDate}
                onTogglePaid={() => togglePaid(item.id)}
                onDateChange={(d) => updateDate(item.id, d)}
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

      {/* Loan Repayments */}
      {loans.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-3 sm:px-4 py-2 bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Loan Repayments
          </div>

          {/* Existing repayments */}
          {(expenses.loanRepayments ?? []).length > 0 && (
            <div className="divide-y divide-border/40">
              {(expenses.loanRepayments ?? []).map((r) => (
                <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.lenderName}</p>
                    <p className="text-xs text-muted-foreground">{r.date}{r.note ? ` · ${r.note}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-orange-600">{formatINR(r.amount)}</span>
                    <button
                      type="button"
                      onClick={() => removeRepayment(r.id)}
                      className="p-1 text-muted-foreground/50 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add repayment form */}
          <div className="px-4 py-4 space-y-3 border-t border-border/40 bg-muted/10">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Record Repayment</p>
            <select
              value={selectedLoanId}
              onChange={(e) => setSelectedLoanId(e.target.value)}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {loans.map((l) => (
                <option key={l.id} value={l.id}>{l.lenderName}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Amount</label>
                <CurrencyInput
                  value={repaymentAmount}
                  onChange={setRepaymentAmount}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Date</label>
                <input
                  type="date"
                  value={repaymentDate}
                  onChange={(e) => setRepaymentDate(e.target.value)}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <input
              type="text"
              value={repaymentNote}
              onChange={(e) => setRepaymentNote(e.target.value)}
              placeholder="Note (optional)"
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button
              type="button"
              onClick={addRepayment}
              disabled={!selectedLoanId || repaymentAmount <= 0}
              className="w-full"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Repayment
            </Button>
          </div>

          {totalLoanRepayments > 0 && (
            <div className="px-4 py-2 bg-muted/20 flex justify-between items-center border-t border-border/40">
              <span className="text-xs text-muted-foreground">Total repaid this month</span>
              <span className="text-sm font-semibold text-orange-600">{formatINR(totalLoanRepayments)}</span>
            </div>
          )}
        </div>
      )}

      {/* Total */}
      <div className="bg-destructive/5 rounded-xl p-4 flex justify-between items-center">
        <span className="text-sm font-medium text-muted-foreground">Total Expenses</span>
        <span className="text-lg font-bold text-destructive">{formatINR(totalExpenses)}</span>
      </div>
    </div>
  );
}
