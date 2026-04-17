import { openDB, type IDBPDatabase } from "idb";
import type { MonthlyEntry, AppSettings, WizardDraft } from "@/types/finance";
import { DEFAULT_EXPENSES, DEFAULT_SAVINGS, DEFAULT_FREELANCE_SOURCES, DEFAULT_FREELANCE_EXPENSES } from "@/lib/defaults";

const DB_NAME = "pfmt-db";
const DB_VERSION = 1;

export interface FinanceDB {
  monthly_entries: {
    key: string; // MonthId "2026-04"
    value: MonthlyEntry;
    indexes: { "by-updated": string };
  };
  settings: {
    key: string;
    value: { key: string; data: AppSettings };
  };
  wizard_drafts: {
    key: string; // "draft_2026-04"
    value: WizardDraft;
  };
  sync_queue: {
    key: number;
    value: {
      id?: number;
      monthId: string;
      action: "export_sheets" | "save_drive";
      createdAt: string;
      retryCount: number;
    };
    indexes: { "by-month": string };
  };
}

let dbPromise: Promise<IDBPDatabase<FinanceDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<FinanceDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FinanceDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Monthly entries store
        const entryStore = db.createObjectStore("monthly_entries", { keyPath: "id" });
        entryStore.createIndex("by-updated", "updatedAt");

        // Settings store
        db.createObjectStore("settings", { keyPath: "key" });

        // Wizard drafts store
        db.createObjectStore("wizard_drafts", { keyPath: "id" });

        // Sync queue store
        const syncStore = db.createObjectStore("sync_queue", {
          keyPath: "id",
          autoIncrement: true,
        });
        syncStore.createIndex("by-month", "monthId");
      },
    });
  }
  return dbPromise;
}

export const DEFAULT_SETTINGS: AppSettings = {
  profile: {
    name: "",
    employerNames: [],
    skipKeywords: [],
    freelanceEnabled: false,
    banks: [],
    onboardingComplete: false,
  },
  anthropicApiKey: undefined,
  defaultExpenses: DEFAULT_EXPENSES,
  defaultSavings: DEFAULT_SAVINGS,
  defaultFreelanceSources: DEFAULT_FREELANCE_SOURCES,
  defaultFreelanceExpenses: DEFAULT_FREELANCE_EXPENSES,
  creditCardEMIs: [],
  theme: "system",
};
