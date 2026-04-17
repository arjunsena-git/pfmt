"use client";
import { useState, useCallback, useEffect } from "react";
import type { MonthlyEntry, IncomeSection, ExpensesSection, SavingsSection } from "@/types/finance";
import { getMonthId, generateId, recomputeEntry } from "@/lib/utils";
import { DEFAULT_EXPENSES, DEFAULT_SAVINGS, DEFAULT_FREELANCE_EXPENSES } from "@/lib/defaults";
import { saveMonthEntry, getMonthEntry, saveDraft, getDraft, deleteDraft } from "@/lib/db/queries";

function buildDefaultEntry(monthId: string): Partial<MonthlyEntry> {
  const now = new Date().toISOString();
  return {
    id: monthId,
    createdAt: now,
    updatedAt: now,
    version: 1,
    income: {
      salaryDate: "",
      salary: 0,
      bonusOldBalance: 0,
      interest: 0,
      dividend: 0,
      businessIncome: 0,
      passiveIncome: 0,
      salaryAccountBalance: 0,
      freelanceItems: [],
      freelanceTotal: 0,
      freelanceParkedAmount: 0,
      freelanceParkedAccount: "Equitas SB",
    } as IncomeSection,
    expenses: {
      items: DEFAULT_EXPENSES.map((d) => ({
        id: d.id,
        label: d.label,
        defaultAmount: d.defaultAmount,
        actualAmount: d.defaultAmount,
        isOverridden: false,
        frequency: d.frequency,
        category: d.category,
      })),
      freelanceExpenses: DEFAULT_FREELANCE_EXPENSES.map((d) => ({
        id: d.id,
        label: d.label,
        amount: d.defaultAmount,
      })),
      totalExpenses: DEFAULT_EXPENSES.reduce((s, d) => s + d.defaultAmount, 0),
      totalFreelanceExpenses: DEFAULT_FREELANCE_EXPENSES.reduce((s, d) => s + d.defaultAmount, 0),
    } as ExpensesSection,
    savings: {
      fromSalary: DEFAULT_SAVINGS.map((d) => ({
        id: d.id,
        label: d.label,
        defaultAmount: d.defaultAmount,
        actualAmount: d.defaultAmount,
        isOverridden: false,
        category: d.category,
        platform: d.platform,
        purpose: d.purpose,
      })),
      fromFreelance: [],
      totalFromSalary: DEFAULT_SAVINGS.reduce((s, d) => s + d.defaultAmount, 0),
      totalFromFreelance: 0,
      totalSavings: DEFAULT_SAVINGS.reduce((s, d) => s + d.defaultAmount, 0),
    } as SavingsSection,
    syncStatus: { sheetsSynced: false, driveSynced: false },
  };
}

export function useMonthEntry(initialMonthId?: string) {
  const [monthId] = useState(initialMonthId ?? getMonthId());
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<Partial<MonthlyEntry>>(() => buildDefaultEntry(initialMonthId ?? getMonthId()));
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing entry or draft on mount
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        // Check for existing saved entry
        const existing = await getMonthEntry(monthId);
        if (existing) {
          setData(existing);
          setIsLoading(false);
          return;
        }
        // Check for draft
        const draft = await getDraft(monthId);
        if (draft) {
          setData(draft.data as Partial<MonthlyEntry>);
          setCurrentStep(draft.currentStep);
        } else {
          setData(buildDefaultEntry(monthId));
        }
      } catch (e) {
        console.error("Failed to load entry:", e);
        setData(buildDefaultEntry(monthId));
      }
      setIsLoading(false);
    }
    load();
  }, [monthId]);

  const updateData = useCallback((patch: Partial<MonthlyEntry>) => {
    setData((prev) => {
      const updated = { ...prev, ...patch };
      // Auto-save draft
      saveDraft({
        id: `draft_${monthId}`,
        monthId,
        currentStep,
        data: updated,
        savedAt: new Date().toISOString(),
      }).catch(console.error);
      return updated;
    });
  }, [monthId, currentStep]);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((s) => Math.min(s + 1, 5));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 0));
  }, []);

  const save = useCallback(async (): Promise<MonthlyEntry | null> => {
    setIsSaving(true);
    try {
      const recomputed = recomputeEntry(data);
      const now = new Date().toISOString();
      const entry: MonthlyEntry = {
        ...(recomputed as MonthlyEntry),
        id: monthId,
        createdAt: data.createdAt ?? now,
        updatedAt: now,
        version: 1,
        syncStatus: data.syncStatus ?? { sheetsSynced: false, driveSynced: false },
      };
      await saveMonthEntry(entry);
      await deleteDraft(monthId);
      return entry;
    } catch (e) {
      console.error("Failed to save entry:", e);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [data, monthId]);

  return {
    monthId,
    data,
    currentStep,
    isLoading,
    isSaving,
    updateData,
    goToStep,
    nextStep,
    prevStep,
    save,
  };
}
