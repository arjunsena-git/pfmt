import { getDB, DEFAULT_SETTINGS } from "@/lib/db/schema";
import type { MonthlyEntry, AppSettings, WizardDraft } from "@/types/finance";

// ─── Monthly Entries ───────────────────────────────────────────────────────

export async function saveMonthEntry(entry: MonthlyEntry): Promise<void> {
  const db = await getDB();
  await db.put("monthly_entries", entry);
}

export async function getMonthEntry(monthId: string): Promise<MonthlyEntry | undefined> {
  const db = await getDB();
  return db.get("monthly_entries", monthId);
}

export async function getAllMonthEntries(): Promise<MonthlyEntry[]> {
  const db = await getDB();
  const all = await db.getAll("monthly_entries");
  // Sort descending by id (YYYY-MM)
  return all.sort((a, b) => b.id.localeCompare(a.id));
}

export async function deleteMonthEntry(monthId: string): Promise<void> {
  const db = await getDB();
  await db.delete("monthly_entries", monthId);
}

// ─── Settings ─────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const record = await db.get("settings", "app_settings");
  return record ? record.data : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put("settings", { key: "app_settings", data: settings });
}

// ─── Wizard Drafts ─────────────────────────────────────────────────────────

export async function saveDraft(draft: WizardDraft): Promise<void> {
  const db = await getDB();
  await db.put("wizard_drafts", { ...draft, savedAt: new Date().toISOString() });
}

export async function getDraft(monthId: string): Promise<WizardDraft | undefined> {
  const db = await getDB();
  return db.get("wizard_drafts", `draft_${monthId}`);
}

export async function deleteDraft(monthId: string): Promise<void> {
  const db = await getDB();
  await db.delete("wizard_drafts", `draft_${monthId}`);
}

// ─── Sync Queue ────────────────────────────────────────────────────────────

export async function addToSyncQueue(
  monthId: string,
  action: "export_sheets" | "save_drive"
): Promise<void> {
  const db = await getDB();
  await db.add("sync_queue", {
    monthId,
    action,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  });
}

export async function getSyncQueue(): Promise<Array<{ id: number; monthId: string; action: string; retryCount: number }>> {
  const db = await getDB();
  return db.getAll("sync_queue") as Promise<Array<{ id: number; monthId: string; action: string; retryCount: number }>>;
}

export async function removeSyncQueueItem(id: number): Promise<void> {
  const db = await getDB();
  await db.delete("sync_queue", id);
}
