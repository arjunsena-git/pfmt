"use client";
import React, { useState } from "react";
import type { AppSettings, CreditCardEMI, CCBank } from "@/types/finance";
import { CurrencyInput } from "@/components/entry/CurrencyInput";
import { formatINR, formatINRCompact, getMonthId, getMonthLabel } from "@/lib/utils";
import { saveSettings } from "@/lib/db/queries";
import { Plus, Trash2, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateId } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Props {
  settings: AppSettings;
  onUpdate: (s: AppSettings) => void;
}

// ─── EMI math ─────────────────────────────────────────────────────────────

function monthDiff(fromId: string, toId: string): number {
  const [fy, fm] = fromId.split("-").map(Number);
  const [ty, tm] = toId.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

function addMonths(monthId: string, n: number): string {
  const [y, m] = monthId.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function emiStats(emi: CreditCardEMI, asOfMonthId: string = getMonthId()) {
  const endMonthId = addMonths(emi.startMonthId, emi.tenure - 1);
  const elapsed = Math.max(0, monthDiff(emi.startMonthId, asOfMonthId) + 1); // months elapsed incl. current
  const monthsPaid = Math.min(elapsed, emi.tenure);
  const monthsRemaining = emi.tenure - monthsPaid;
  const amountPaid = monthsPaid * emi.monthlyInstalment;
  const amountRemaining = monthsRemaining * emi.monthlyInstalment;
  const isActive = !emi.closedEarly && monthsRemaining > 0;
  return { endMonthId, monthsPaid, monthsRemaining, amountPaid, amountRemaining, isActive };
}

// ─── Bank config ──────────────────────────────────────────────────────────

const BANKS: { key: CCBank; label: string; color: string }[] = [
  { key: "axis", label: "Axis Bank", color: "text-[#97144D]" },
  { key: "icici", label: "ICICI Bank", color: "text-[#F0821A]" },
];

// ─── Form state ───────────────────────────────────────────────────────────

interface FormState {
  bank: CCBank;
  label: string;
  totalAmount: number; // paise
  monthlyInstalment: number; // paise
  tenure: string; // string for input control
  startMonthId: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  bank: "axis",
  label: "",
  totalAmount: 0,
  monthlyInstalment: 0,
  tenure: "",
  startMonthId: getMonthId(),
  notes: "",
};

// ─── Component ────────────────────────────────────────────────────────────

export function CreditCardEMIs({ settings, onUpdate }: Props) {
  const emis = settings.creditCardEMIs ?? [];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Auto-compute monthly instalment when total + tenure change
  const handleTotalChange = (paise: number) => {
    const tenure = parseInt(form.tenure) || 0;
    setForm((f) => ({
      ...f,
      totalAmount: paise,
      monthlyInstalment: tenure > 0 ? Math.round(paise / tenure) : f.monthlyInstalment,
    }));
  };

  const handleTenureChange = (val: string) => {
    const months = parseInt(val) || 0;
    setForm((f) => ({
      ...f,
      tenure: val,
      monthlyInstalment: months > 0 && f.totalAmount > 0
        ? Math.round(f.totalAmount / months)
        : f.monthlyInstalment,
    }));
  };

  const handleAdd = async () => {
    if (!form.label.trim() || !form.tenure || form.monthlyInstalment === 0) return;
    setSaving(true);
    const newEmi: CreditCardEMI = {
      id: generateId(),
      bank: form.bank,
      label: form.label.trim(),
      totalAmount: form.totalAmount,
      monthlyInstalment: form.monthlyInstalment,
      tenure: parseInt(form.tenure),
      startMonthId: form.startMonthId,
      notes: form.notes.trim() || undefined,
    };
    const updated = { ...settings, creditCardEMIs: [...emis, newEmi] };
    await saveSettings(updated);
    onUpdate(updated);
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const updated = { ...settings, creditCardEMIs: emis.filter((e) => e.id !== id) };
    await saveSettings(updated);
    onUpdate(updated);
  };

  const handleToggleClosed = async (emi: CreditCardEMI) => {
    const updated = {
      ...settings,
      creditCardEMIs: emis.map((e) =>
        e.id === emi.id ? { ...e, closedEarly: !e.closedEarly } : e
      ),
    };
    await saveSettings(updated);
    onUpdate(updated);
  };

  // Group by bank
  const byBank = BANKS.map(({ key, label, color }) => ({
    key,
    label,
    color,
    emis: emis.filter((e) => e.bank === key),
  }));

  // Active EMI totals per bank
  const activeTotals = Object.fromEntries(
    BANKS.map(({ key }) => [
      key,
      emis
        .filter((e) => e.bank === key && emiStats(e).isActive)
        .reduce((s, e) => s + e.monthlyInstalment, 0),
    ])
  );

  return (
    <div className="space-y-4">
      {/* Per-bank summary + EMI list */}
      {byBank.map(({ key, label, color, emis: bankEmis }) => (
        <div key={key} className="rounded-xl border border-border overflow-hidden">
          {/* Bank header */}
          <div className="px-4 py-2.5 bg-muted/40 flex items-center justify-between">
            <span className={cn("text-sm font-semibold", color)}>{label}</span>
            {activeTotals[key] > 0 && (
              <span className="text-xs text-muted-foreground">
                Active EMIs:{" "}
                <span className="font-semibold text-foreground">
                  {formatINR(activeTotals[key])}/mo
                </span>
              </span>
            )}
          </div>

          {bankEmis.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground italic">No EMIs added yet.</p>
          ) : (
            <div className="divide-y divide-border/50">
              {bankEmis.map((emi) => {
                const stats = emiStats(emi);
                const isExpanded = expandedId === emi.id;

                return (
                  <div key={emi.id}>
                    {/* Row */}
                    <div className="px-4 py-3 flex items-start gap-3">
                      {/* Status dot */}
                      <div className="mt-0.5 shrink-0">
                        {stats.isActive ? (
                          <AlertCircle className="w-4 h-4 text-yellow-500" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => setExpandedId(isExpanded ? null : emi.id)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium truncate">{emi.label}</p>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-sm font-bold">
                                {formatINR(emi.monthlyInstalment)}
                                <span className="text-xs text-muted-foreground font-normal">/mo</span>
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className={cn(
                              "text-xs font-medium px-1.5 py-0.5 rounded-full",
                              stats.isActive
                                ? "bg-yellow-500/10 text-yellow-600"
                                : "bg-green-500/10 text-green-600"
                            )}>
                              {stats.isActive
                                ? `${stats.monthsRemaining} mo left`
                                : emi.closedEarly ? "Closed early" : "Completed"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Ends {getMonthLabel(stats.endMonthId)}
                            </span>
                          </div>
                        </button>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleClosed(emi)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs"
                          title={emi.closedEarly ? "Mark as active" : "Mark as closed"}
                        >
                          {emi.closedEarly ? (
                            <AlertCircle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(emi.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Delete EMI"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-4 pb-3 ml-7 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border-t border-border/40 pt-2.5">
                        <div>
                          <span className="text-muted-foreground">Total financed</span>
                          <p className="font-medium">{formatINR(emi.totalAmount)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Tenure</span>
                          <p className="font-medium">{emi.tenure} months</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Paid so far</span>
                          <p className="font-medium text-green-600">{formatINRCompact(stats.amountPaid)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Outstanding</span>
                          <p className={cn("font-medium", stats.isActive ? "text-yellow-600" : "text-muted-foreground")}>
                            {formatINRCompact(stats.amountRemaining)}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Started</span>
                          <p className="font-medium">{getMonthLabel(emi.startMonthId)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Ends</span>
                          <p className="font-medium">{getMonthLabel(stats.endMonthId)}</p>
                        </div>
                        {emi.notes && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Notes</span>
                            <p className="font-medium">{emi.notes}</p>
                          </div>
                        )}
                        {/* Progress bar */}
                        <div className="col-span-2 mt-1">
                          <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary/70 transition-all"
                              style={{ width: `${(stats.monthsPaid / emi.tenure) * 100}%` }}
                            />
                          </div>
                          <p className="text-muted-foreground mt-0.5">
                            {stats.monthsPaid}/{emi.tenure} instalments paid
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {/* Add new EMI */}
      {!showForm ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => setShowForm(true)}
        >
          <Plus className="w-4 h-4" /> Add EMI
        </Button>
      ) : (
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <p className="text-sm font-semibold">New EMI</p>

          {/* Bank selector */}
          <div className="flex gap-2">
            {BANKS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setForm((f) => ({ ...f, bank: key }))}
                className={cn(
                  "flex-1 py-2 rounded-xl text-sm font-medium border transition-all",
                  form.bank === key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-foreground hover:bg-muted/40"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Label */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">What for?</label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="e.g. iPhone 16, Laptop, AC"
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Total amount */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Total financed amount</label>
            <CurrencyInput
              id="emi-total"
              value={form.totalAmount}
              onChange={handleTotalChange}
              size="default"
            />
          </div>

          {/* Tenure + Monthly instalment side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tenure (months)</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={84}
                value={form.tenure}
                onChange={(e) => handleTenureChange(e.target.value)}
                placeholder="e.g. 12"
                className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Monthly instalment</label>
              <CurrencyInput
                id="emi-monthly"
                value={form.monthlyInstalment}
                onChange={(v) => setForm((f) => ({ ...f, monthlyInstalment: v }))}
                size="default"
              />
            </div>
          </div>

          {/* Start month */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Start month</label>
            <input
              type="month"
              value={form.startMonthId}
              onChange={(e) => setForm((f) => ({ ...f, startMonthId: e.target.value }))}
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Notes (optional)</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional note"
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Preview */}
          {form.monthlyInstalment > 0 && form.tenure && (
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {formatINR(form.monthlyInstalment)}/mo × {form.tenure} months
              = <span className="text-foreground font-medium">
                {formatINRCompact(form.monthlyInstalment * parseInt(form.tenure || "0"))}
              </span>
              {" "}total repayment
              {form.startMonthId && form.tenure && (
                <> · ends <span className="text-foreground font-medium">
                  {getMonthLabel(addMonths(form.startMonthId, parseInt(form.tenure) - 1))}
                </span></>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              onClick={handleAdd}
              disabled={saving || !form.label.trim() || !form.tenure || form.monthlyInstalment === 0}
              size="sm"
              className="flex-1"
            >
              {saving ? "Saving…" : "Add EMI"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
