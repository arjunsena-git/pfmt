"use client";
import React, { useState } from "react";
import type { UserProfile, BankConfig } from "@/types/finance";
import { saveSettings, getSettings } from "@/lib/db/queries";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronRight, ChevronLeft, Plus, X, Wallet,
  User, Briefcase, Building2, KeyRound, Check,
} from "lucide-react";

// ─── Step props ────────────────────────────────────────────────────────────

interface StepProps {
  profile: UserProfile;
  apiKey: string;
  setProfile: (p: UserProfile) => void;
  setApiKey: (k: string) => void;
}

// ─── Step 0: Welcome ───────────────────────────────────────────────────────

function StepWelcome() {
  return (
    <div className="flex flex-col items-center text-center space-y-5 pt-6">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Wallet className="w-10 h-10 text-primary" />
      </div>
      <div>
        <h1 className="text-2xl font-bold">Personal Finance<br />Monthly Tracker</h1>
        <p className="text-muted-foreground text-sm mt-3 leading-relaxed max-w-xs">
          Track your monthly income, expenses, and savings — all stored privately on your device.
          Takes 2 minutes to set up.
        </p>
      </div>
      <div className="w-full text-left space-y-2 pt-2">
        {[
          "Monthly income & expense entry wizard",
          "AI-powered bank statement import",
          "Savings & investment tracking",
          "Google Sheets export",
        ].map((f) => (
          <div key={f} className="flex items-center gap-2 text-sm">
            <Check className="w-4 h-4 text-primary shrink-0" />
            <span>{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 1: Profile ───────────────────────────────────────────────────────

function StepProfile({ profile, setProfile }: StepProps) {
  const [empInput, setEmpInput] = useState("");
  const [kwInput, setKwInput] = useState("");

  const addEmployer = () => {
    const v = empInput.trim();
    if (!v || profile.employerNames.includes(v)) return;
    setProfile({ ...profile, employerNames: [...profile.employerNames, v] });
    setEmpInput("");
  };

  const addKeyword = () => {
    const v = kwInput.trim();
    if (!v || profile.skipKeywords.includes(v)) return;
    setProfile({ ...profile, skipKeywords: [...profile.skipKeywords, v] });
    setKwInput("");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <User className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-lg">Your Profile</h2>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Your Name</label>
        <input
          type="text"
          value={profile.name}
          onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          placeholder="e.g. Rahul Sharma"
          className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-1.5">
          <Briefcase className="w-3.5 h-3.5" /> Employer Name(s) to Skip
        </label>
        <p className="text-xs text-muted-foreground">
          Salary credits from these employers will be ignored when scanning bank statements for passive income.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={empInput}
            onChange={(e) => setEmpInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addEmployer()}
            placeholder="e.g. ACME TECHNOLOGIES"
            className="flex-1 h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="button" size="sm" onClick={addEmployer} variant="outline">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {profile.employerNames.map((e) => (
            <span key={e} className="flex items-center gap-1 text-xs bg-muted rounded-lg px-2 py-1">
              {e}
              <button type="button" onClick={() =>
                setProfile({ ...profile, employerNames: profile.employerNames.filter((x) => x !== e) })
              }>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Self-Transfer Keywords to Skip <span className="text-muted-foreground font-normal">(optional)</span></label>
        <p className="text-xs text-muted-foreground">
          Large transfers using your name or account nick-names that are your own money moving between accounts.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={kwInput}
            onChange={(e) => setKwInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addKeyword()}
            placeholder="e.g. RAHUL SHARMA"
            className="flex-1 h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="button" size="sm" onClick={addKeyword} variant="outline">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {profile.skipKeywords.map((k) => (
            <span key={k} className="flex items-center gap-1 text-xs bg-muted rounded-lg px-2 py-1">
              {k}
              <button type="button" onClick={() =>
                setProfile({ ...profile, skipKeywords: profile.skipKeywords.filter((x) => x !== k) })
              }>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Income Sources ────────────────────────────────────────────────

function StepIncomeSources({ profile, setProfile }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-lg">Income Sources</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the income types that apply to you. You can change these later.
        </p>
      </div>

      {[
        { key: "freelanceEnabled", label: "Freelance / Side Income", description: "Track earnings from freelance projects, consulting, or side gigs" },
      ].map(({ key, label, description }) => {
        const enabled = profile[key as keyof UserProfile] as boolean;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setProfile({ ...profile, [key]: !enabled })}
            className={cn(
              "w-full text-left rounded-xl border-2 px-4 py-3.5 transition-colors space-y-0.5",
              enabled
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{label}</span>
              <div className={cn(
                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                enabled ? "border-primary bg-primary" : "border-border"
              )}>
                {enabled && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </button>
        );
      })}

      <div className="rounded-xl bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Always included:</p>
        {["Salary", "Dividends", "Interest (FD / Savings)", "P2P / Passive Income"].map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <Check className="w-3 h-3 text-primary shrink-0" /> {s}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 3: Bank Configuration ────────────────────────────────────────────

function StepBanks({ profile, setProfile }: StepProps) {
  const [bankName, setBankName] = useState("");
  const [importType, setImportType] = useState<"pdf" | "screenshots">("pdf");

  const addBank = () => {
    const name = bankName.trim();
    if (!name) return;
    const bank: BankConfig = {
      id: `bank_${Date.now()}`,
      name,
      importType,
    };
    setProfile({ ...profile, banks: [...profile.banks, bank] });
    setBankName("");
    setImportType("pdf");
  };

  const removeBank = (id: string) =>
    setProfile({ ...profile, banks: profile.banks.filter((b) => b.id !== id) });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Building2 className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-lg">Your Banks</h2>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        Add the banks whose statements you want to import. For each bank, choose how you&apos;ll provide the statement.
      </p>

      <div className="space-y-3 rounded-xl border border-border p-3">
        <input
          type="text"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addBank()}
          placeholder="Bank name (e.g. HDFC Bank)"
          className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="grid grid-cols-2 gap-2">
          {(["pdf", "screenshots"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setImportType(t)}
              className={cn(
                "rounded-xl border-2 px-3 py-2 text-sm font-medium transition-colors",
                importType === t ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
              )}
            >
              {t === "pdf" ? "📄 PDF Upload" : "📸 Screenshots"}
            </button>
          ))}
        </div>
        <Button type="button" onClick={addBank} disabled={!bankName.trim()} className="w-full gap-2" size="sm">
          <Plus className="w-4 h-4" /> Add Bank
        </Button>
      </div>

      {profile.banks.length > 0 && (
        <div className="space-y-2">
          {profile.banks.map((b) => (
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
      )}

      {profile.banks.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          You can skip this and add banks later in Settings.
        </p>
      )}
    </div>
  );
}

// ─── Step 4: API Key ───────────────────────────────────────────────────────

function StepApiKey({ apiKey, setApiKey }: StepProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-primary" />
        <h2 className="font-bold text-lg">Anthropic API Key</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Required for AI bank statement import and financial insights. Your key is stored only on this device and never shared.
      </p>

      <div className="space-y-2">
        <label className="text-sm font-medium">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-ant-api03-..."
          className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="rounded-xl bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1.5">
        <p className="font-medium text-foreground text-sm">How to get an API key:</p>
        <p>1. Go to <span className="font-mono text-primary">console.anthropic.com</span></p>
        <p>2. Sign up / log in → API Keys → Create Key</p>
        <p>3. Paste it above. You&apos;ll be charged per use at very low rates (few paise per import).</p>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        You can skip this and add it later in Settings → API Key.
      </p>
    </div>
  );
}

// ─── Main Wizard ───────────────────────────────────────────────────────────

const STEPS = ["Welcome", "Profile", "Income", "Banks", "API Key"];

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    employerNames: [],
    skipKeywords: [],
    freelanceEnabled: false,
    banks: [],
    onboardingComplete: false,
  });
  const [apiKey, setApiKey] = useState("");

  const isLast = step === STEPS.length - 1;

  const canNext = step === 0
    ? true
    : step === 1
    ? profile.name.trim().length > 0
    : true;

  const handleFinish = async () => {
    setSaving(true);
    const settings = await getSettings();
    await saveSettings({
      ...settings,
      profile: { ...profile, onboardingComplete: true },
      anthropicApiKey: apiKey.trim() || undefined,
    });
    onComplete();
  };

  const stepProps: StepProps = { profile, apiKey, setProfile, setApiKey };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 pt-8 pb-4 shrink-0">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-full transition-all",
              i === step ? "w-6 h-2 bg-primary" : i < step ? "w-2 h-2 bg-primary/60" : "w-2 h-2 bg-muted"
            )}
          />
        ))}
      </div>

      {/* Step label */}
      <p className="text-center text-xs text-muted-foreground mb-1 shrink-0">
        {step > 0 ? `Step ${step} of ${STEPS.length - 1}` : ""}
      </p>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-2">
        {step === 0 && <StepWelcome />}
        {step === 1 && <StepProfile {...stepProps} />}
        {step === 2 && <StepIncomeSources {...stepProps} />}
        {step === 3 && <StepBanks {...stepProps} />}
        {step === 4 && <StepApiKey {...stepProps} />}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] border-t border-border flex gap-3">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
        )}
        <Button
          onClick={isLast ? handleFinish : () => setStep(step + 1)}
          disabled={!canNext || saving}
          className="flex-1 gap-1"
        >
          {isLast
            ? saving ? "Setting up…" : "Get Started"
            : step === 0 ? "Let's go" : "Next"}
          {!isLast && <ChevronRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
