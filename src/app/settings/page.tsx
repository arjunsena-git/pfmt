"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { getSettings, saveSettings } from "@/lib/db/queries";
import type { AppSettings, BankConfig, UserProfile } from "@/types/finance";
import { DEFAULT_SETTINGS } from "@/lib/db/schema";
import { exportToGoogleSheets, saveToDrive } from "@/lib/google/sheets";
import { useMonthHistory } from "@/hooks/useMonthHistory";
import { getMonthLabel, getMonthId } from "@/lib/utils";
import {
  RefreshCw, Check, LogIn, LogOut, CheckCircle2,
  Plus, X, KeyRound, Eye, EyeOff,
} from "lucide-react";
import { PushSetup } from "@/components/notifications/PushSetup";
import { CreditCardEMIs } from "@/components/settings/CreditCardEMIs";
import { Subscriptions } from "@/components/settings/Subscriptions";
import { useSession, signIn, signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [exportMonth, setExportMonth] = useState(getMonthId());
  const [exportStatus, setExportStatus] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);

  // Profile editing state
  const [empInput, setEmpInput] = useState("");
  const [kwInput, setKwInput] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankType, setBankType] = useState<"pdf" | "screenshots">("pdf");

  const { entries } = useMonthHistory();
  const accessToken = session?.accessToken;

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      setSpreadsheetId(s.googleSheetId ?? "");
      setApiKey(s.anthropicApiKey ?? "");
    });
  }, []);

  const updateProfile = async (patch: Partial<UserProfile>) => {
    const updated = { ...settings, profile: { ...settings.profile, ...patch } };
    setSettings(updated);
    await saveSettings(updated);
  };

  const handleSaveApiKey = async () => {
    const updated = { ...settings, anthropicApiKey: apiKey.trim() || undefined };
    setSettings(updated);
    await saveSettings(updated);
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  };

  const addEmployer = async () => {
    const v = empInput.trim();
    if (!v || settings.profile.employerNames.includes(v)) return;
    await updateProfile({ employerNames: [...settings.profile.employerNames, v] });
    setEmpInput("");
  };

  const addKeyword = async () => {
    const v = kwInput.trim();
    if (!v || settings.profile.skipKeywords.includes(v)) return;
    await updateProfile({ skipKeywords: [...settings.profile.skipKeywords, v] });
    setKwInput("");
  };

  const addBank = async () => {
    const name = bankName.trim();
    if (!name) return;
    const bank: BankConfig = { id: `bank_${Date.now()}`, name, importType: bankType };
    await updateProfile({ banks: [...settings.profile.banks, bank] });
    setBankName("");
    setBankType("pdf");
  };

  const removeBank = async (id: string) =>
    updateProfile({ banks: settings.profile.banks.filter((b) => b.id !== id) });

  const handleSaveSpreadsheetId = async () => {
    const updated = { ...settings, googleSheetId: spreadsheetId || undefined };
    await saveSettings(updated);
    setSettings(updated);
    setExportStatus("Spreadsheet ID saved.");
  };

  const handleExportToSheets = async () => {
    const entry = entries.find((e) => e.id === exportMonth);
    if (!entry) { setExportStatus("No entry found for selected month."); return; }
    if (!accessToken) { setExportStatus("Please connect your Google account first."); return; }
    setIsExporting(true);
    setExportStatus("Exporting…");
    try {
      const result = await exportToGoogleSheets(
        entry, accessToken, spreadsheetId || undefined, settings.profile.name
      );
      const updated = { ...settings, googleSheetId: result.spreadsheetId };
      await saveSettings(updated);
      setSettings(updated);
      setSpreadsheetId(result.spreadsheetId);
      setExportStatus(`✓ Exported to "${result.tabName}" tab.`);
    } catch (e) {
      setExportStatus(`Export failed: ${(e as Error).message}`);
    }
    setIsExporting(false);
  };

  const handleSaveToDrive = async () => {
    const entry = entries.find((e) => e.id === exportMonth);
    if (!entry) { setExportStatus("No entry found for selected month."); return; }
    if (!accessToken) { setExportStatus("Please connect your Google account first."); return; }
    setIsExporting(true);
    setExportStatus("Saving to Drive…");
    try {
      const result = await saveToDrive(entry, accessToken, undefined, entry.syncStatus.driveFileId);
      setExportStatus(`✓ Saved to Drive. File ID: ${result.fileId}`);
    } catch (e) {
      setExportStatus(`Drive save failed: ${(e as Error).message}`);
    }
    setIsExporting(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold pt-2">Settings</h1>

      {/* ── Profile ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Your Profile</h2>

        <div className="space-y-2">
          <label className="text-sm font-medium">Name</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={settings.profile.name}
              onChange={(e) => setSettings({ ...settings, profile: { ...settings.profile, name: e.target.value } })}
              onBlur={() => saveSettings(settings)}
              placeholder="Your name"
              className="flex-1 h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Employer Names to Skip</label>
          <p className="text-xs text-muted-foreground">Salary credits from these will be ignored in bank import.</p>
          <div className="flex gap-2">
            <input type="text" value={empInput} onChange={(e) => setEmpInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addEmployer()}
              placeholder="e.g. ACME CORP"
              className="flex-1 h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <Button type="button" size="sm" variant="outline" onClick={addEmployer}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {settings.profile.employerNames.map((e) => (
              <span key={e} className="flex items-center gap-1 text-xs bg-muted rounded-lg px-2 py-1">
                {e}
                <button type="button" onClick={() => updateProfile({ employerNames: settings.profile.employerNames.filter((x) => x !== e) })}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Self-Transfer Keywords to Skip <span className="text-muted-foreground font-normal">(optional)</span></label>
          <div className="flex gap-2">
            <input type="text" value={kwInput} onChange={(e) => setKwInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addKeyword()}
              placeholder="e.g. YOUR NAME"
              className="flex-1 h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <Button type="button" size="sm" variant="outline" onClick={addKeyword}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {settings.profile.skipKeywords.map((k) => (
              <span key={k} className="flex items-center gap-1 text-xs bg-muted rounded-lg px-2 py-1">
                {k}
                <button type="button" onClick={() => updateProfile({ skipKeywords: settings.profile.skipKeywords.filter((x) => x !== k) })}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            Freelance / Side Income
          </label>
          <button
            type="button"
            onClick={() => updateProfile({ freelanceEnabled: !settings.profile.freelanceEnabled })}
            className={cn(
              "w-full text-left rounded-xl border-2 px-4 py-3 text-sm transition-colors flex items-center justify-between",
              settings.profile.freelanceEnabled ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <span>{settings.profile.freelanceEnabled ? "Enabled" : "Disabled"}</span>
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center",
              settings.profile.freelanceEnabled ? "border-primary bg-primary" : "border-border"
            )}>
              {settings.profile.freelanceEnabled && <Check className="w-3 h-3 text-white" />}
            </div>
          </button>
        </div>
      </div>

      {/* ── Banks ───────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Bank Import Configuration</h2>
        <p className="text-sm text-muted-foreground">Configure your banks and how to provide statements for AI import.</p>

        <div className="space-y-3 rounded-xl border border-border p-3">
          <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addBank()}
            placeholder="Bank name (e.g. HDFC Bank)"
            className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <div className="grid grid-cols-2 gap-2">
            {(["pdf", "screenshots"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setBankType(t)}
                className={cn("rounded-xl border-2 px-3 py-2 text-sm font-medium transition-colors",
                  bankType === t ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground")}>
                {t === "pdf" ? "📄 PDF Upload" : "📸 Screenshots"}
              </button>
            ))}
          </div>
          <Button type="button" onClick={addBank} disabled={!bankName.trim()} className="w-full gap-2" size="sm">
            <Plus className="w-4 h-4" /> Add Bank
          </Button>
        </div>

        {settings.profile.banks.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">{b.name}</p>
              <p className="text-xs text-muted-foreground">{b.importType === "pdf" ? "PDF upload" : "Screenshots"}</p>
            </div>
            <button type="button" onClick={() => removeBank(b.id)} className="text-muted-foreground hover:text-destructive">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* ── API Key ─────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Anthropic API Key</h2>
        </div>
        <p className="text-sm text-muted-foreground">Required for AI bank statement import and financial insights. Stored only on this device.</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="w-full h-11 rounded-xl border border-input bg-background px-3 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button type="button" onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <Button onClick={handleSaveApiKey} variant="outline" size="icon">
            {apiKeySaved ? <Check className="w-4 h-4 text-green-500" /> : <Check className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* ── Google Integration ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Google Integration</h2>

        {sessionStatus === "loading" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Checking connection…
          </div>
        ) : session ? (
          <div className={`flex items-center justify-between rounded-xl px-4 py-3 ${
            accessToken ? "bg-green-500/10 border border-green-500/20" : "bg-yellow-500/10 border border-yellow-500/20"
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`w-4 h-4 shrink-0 ${accessToken ? "text-green-500" : "text-yellow-500"}`} />
              <div>
                <p className={`text-sm font-medium ${accessToken ? "text-green-700 dark:text-green-400" : "text-yellow-700 dark:text-yellow-400"}`}>
                  {accessToken ? "Connected" : "Session expired — reconnect"}
                </p>
                <p className="text-xs text-muted-foreground">{session.user?.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {!accessToken && (
                <Button size="sm" onClick={() => signIn("google")} className="gap-1.5 text-xs">
                  <LogIn className="w-3.5 h-3.5" /> Reconnect
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => signOut()} className="gap-1.5 text-xs">
                <LogOut className="w-3.5 h-3.5" /> Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Connect your Google account to export monthly entries to Google Sheets.</p>
            <Button onClick={() => signIn("google")} className="gap-2">
              <LogIn className="w-4 h-4" /> Connect Google Account
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Spreadsheet ID</label>
          <p className="text-xs text-muted-foreground">
            From your sheet URL: <span className="font-mono bg-muted/50 px-1 rounded">spreadsheets/d/<strong>[ID]</strong>/edit</span>
          </p>
          <div className="flex gap-2">
            <input type="text" value={spreadsheetId} onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="Paste spreadsheet ID…"
              className="flex-1 h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono" />
            <Button onClick={handleSaveSpreadsheetId} variant="outline" size="icon">
              <Check className="w-4 h-4" />
            </Button>
          </div>
          {spreadsheetId && <p className="text-xs text-green-600 font-medium">✓ Each month exports as a new tab in this sheet.</p>}
        </div>
      </div>

      {/* ── Export ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Export</h2>
        <div className="space-y-2">
          <label className="text-sm font-medium">Month to export</label>
          <select value={exportMonth} onChange={(e) => setExportMonth(e.target.value)}
            className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            {entries.map((e) => <option key={e.id} value={e.id}>{getMonthLabel(e.id)}</option>)}
          </select>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleExportToSheets} disabled={isExporting || entries.length === 0 || !accessToken} className="flex-1 gap-2">
            {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
            Export to Sheets
          </Button>
          <Button onClick={handleSaveToDrive} disabled={isExporting || entries.length === 0 || !accessToken} variant="outline" className="flex-1 gap-2">
            Save to Drive
          </Button>
        </div>
        {!accessToken && <p className="text-xs text-muted-foreground">Connect your Google account above to enable export.</p>}
        {exportStatus && <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">{exportStatus}</p>}
      </div>

      {/* ── Credit Card EMIs ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="font-semibold">Credit Card EMIs</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track running EMIs on your credit cards.</p>
        </div>
        <CreditCardEMIs settings={settings} onUpdate={setSettings} />
      </div>

      {/* ── Subscriptions ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="font-semibold">Subscriptions</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track recurring subscriptions — OpenAI, Anthropic, Netflix, and more.</p>
        </div>
        <Subscriptions settings={settings} onUpdate={setSettings} />
      </div>

      {/* ── Reminders ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold">Monthly Reminders</h2>
        <PushSetup />
      </div>

      {/* ── Data ────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-semibold">Data</h2>
        <p className="text-sm text-muted-foreground">{entries.length} month entries stored locally on this device.</p>
        <p className="text-xs text-muted-foreground">Data is stored in your browser&apos;s IndexedDB and never sent anywhere without your action.</p>
      </div>
    </div>
  );
}
