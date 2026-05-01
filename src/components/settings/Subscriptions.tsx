"use client";
import React, { useState } from "react";
import type { AppSettings, Subscription, SubscriptionBillingCycle } from "@/types/finance";
import { CurrencyInput } from "@/components/entry/CurrencyInput";
import { formatINR } from "@/lib/utils";
import { saveSettings } from "@/lib/db/queries";
import { Plus, Trash2, ChevronDown, ChevronUp, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateId } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Props {
  settings: AppSettings;
  onUpdate: (s: AppSettings) => void;
}

interface FormState {
  name: string;
  amount: number; // paise
  billingCycle: SubscriptionBillingCycle;
  startDate: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  amount: 0,
  billingCycle: "monthly",
  startDate: "",
  notes: "",
};

function monthlyEquivalent(sub: Subscription): number {
  if (sub.billingCycle === "monthly") return sub.amount;
  return Math.round(sub.amount / 12);
}

export function Subscriptions({ settings, onUpdate }: Props) {
  const subs = settings.subscriptions ?? [];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!form.name.trim() || form.amount === 0) return;
    setSaving(true);
    const newSub: Subscription = {
      id: generateId(),
      name: form.name.trim(),
      amount: form.amount,
      billingCycle: form.billingCycle,
      startDate: form.startDate || undefined,
      notes: form.notes.trim() || undefined,
      isActive: true,
    };
    const updated = { ...settings, subscriptions: [...subs, newSub] };
    await saveSettings(updated);
    onUpdate(updated);
    setForm(EMPTY_FORM);
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const updated = { ...settings, subscriptions: subs.filter((s) => s.id !== id) };
    await saveSettings(updated);
    onUpdate(updated);
  };

  const handleToggleActive = async (sub: Subscription) => {
    const updated = {
      ...settings,
      subscriptions: subs.map((s) =>
        s.id === sub.id ? { ...s, isActive: !s.isActive } : s
      ),
    };
    await saveSettings(updated);
    onUpdate(updated);
  };

  const active = subs.filter((s) => s.isActive);
  const inactive = subs.filter((s) => !s.isActive);
  const monthlyTotal = active.reduce((sum, s) => sum + monthlyEquivalent(s), 0);

  return (
    <div className="space-y-4">
      {/* Total summary */}
      {active.length > 0 && (
        <div className="rounded-xl bg-muted/40 border border-border px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{active.length} active subscription{active.length !== 1 ? "s" : ""}</span>
          <span className="text-sm font-semibold">
            {formatINR(monthlyTotal)}
            <span className="text-xs text-muted-foreground font-normal">/mo</span>
          </span>
        </div>
      )}

      {/* Active subscriptions */}
      {subs.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border/50">
          {[...active, ...inactive].map((sub) => {
            const isExpanded = expandedId === sub.id;
            return (
              <div key={sub.id}>
                <div className="px-4 py-3 flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {sub.isActive ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn("text-sm font-medium truncate", !sub.isActive && "text-muted-foreground line-through")}>
                          {sub.name}
                        </p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-sm font-bold">
                            {formatINR(sub.amount)}
                            <span className="text-xs text-muted-foreground font-normal">
                              /{sub.billingCycle === "monthly" ? "mo" : "yr"}
                            </span>
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      <div className="mt-0.5">
                        <span className={cn(
                          "text-xs font-medium px-1.5 py-0.5 rounded-full",
                          sub.isActive
                            ? "bg-green-500/10 text-green-600"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {sub.isActive ? "Active" : "Paused"}
                        </span>
                        {sub.billingCycle === "annual" && sub.isActive && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ≈ {formatINR(monthlyEquivalent(sub))}/mo
                          </span>
                        )}
                      </div>
                    </button>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(sub)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title={sub.isActive ? "Pause subscription" : "Reactivate subscription"}
                    >
                      {sub.isActive ? (
                        <XCircle className="w-3.5 h-3.5" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(sub.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Delete subscription"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-3 ml-7 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border-t border-border/40 pt-2.5">
                    <div>
                      <span className="text-muted-foreground">Billing cycle</span>
                      <p className="font-medium capitalize">{sub.billingCycle}</p>
                    </div>
                    {sub.billingCycle === "annual" && (
                      <div>
                        <span className="text-muted-foreground">Monthly equivalent</span>
                        <p className="font-medium">{formatINR(monthlyEquivalent(sub))}/mo</p>
                      </div>
                    )}
                    {sub.startDate && (
                      <div>
                        <span className="text-muted-foreground">Started</span>
                        <p className="font-medium">{new Date(sub.startDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</p>
                      </div>
                    )}
                    {sub.notes && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Notes</span>
                        <p className="font-medium">{sub.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {subs.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground italic">No subscriptions added yet.</p>
      )}

      {/* Add form */}
      {!showForm ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-2"
          onClick={() => setShowForm(true)}
        >
          <Plus className="w-4 h-4" /> Add Subscription
        </Button>
      ) : (
        <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
          <p className="text-sm font-semibold">New Subscription</p>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Service name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. OpenAI, Netflix, Anthropic"
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Billing cycle selector */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Billing cycle</label>
            <div className="flex gap-2">
              {(["monthly", "annual"] as SubscriptionBillingCycle[]).map((cycle) => (
                <button
                  key={cycle}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, billingCycle: cycle }))}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-sm font-medium border transition-all capitalize",
                    form.billingCycle === cycle
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-foreground hover:bg-muted/40"
                  )}
                >
                  {cycle}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Amount ({form.billingCycle === "monthly" ? "per month" : "per year"})
            </label>
            <CurrencyInput
              id="sub-amount"
              value={form.amount}
              onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
              size="default"
            />
          </div>

          {form.billingCycle === "annual" && form.amount > 0 && (
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              ≈ <span className="text-foreground font-medium">{formatINR(Math.round(form.amount / 12))}/mo</span> monthly equivalent
            </div>
          )}

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Start date (optional)</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

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

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              onClick={handleAdd}
              disabled={saving || !form.name.trim() || form.amount === 0}
              size="sm"
              className="flex-1"
            >
              {saving ? "Saving…" : "Add Subscription"}
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
