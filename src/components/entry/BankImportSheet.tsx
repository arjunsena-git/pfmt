"use client";
import React, { useState, useRef, useEffect } from "react";
import type { IncomeSection, BankConfig, AppSettings } from "@/types/finance";
import type { ImportedTransaction, ImportCategory } from "@/app/api/bank-import/route";
import { formatINR, formatINRCompact } from "@/lib/utils";
import { getSettings } from "@/lib/db/queries";
import { DEFAULT_SETTINGS } from "@/lib/db/schema";
import {
  X, Upload, Loader2, CheckSquare, Square, TrendingUp,
  Percent, PiggyBank, HelpCircle, AlertCircle, FileText, Image,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  income: IncomeSection;
  onApply: (patch: Partial<IncomeSection>) => void;
  onClose: () => void;
}

const CAT_META: Record<ImportCategory, { label: string; field: keyof IncomeSection; color: string; Icon: React.ElementType }> = {
  dividend: { label: "Dividend",      field: "dividend",      color: "text-green-500",            Icon: TrendingUp },
  p2p:      { label: "Passive / P2P", field: "passiveIncome", color: "text-blue-400",             Icon: PiggyBank  },
  interest: { label: "Interest",      field: "interest",      color: "text-yellow-400",           Icon: Percent    },
  other:    { label: "Other Income",  field: "passiveIncome", color: "text-muted-foreground",     Icon: HelpCircle },
};
const CATEGORY_ORDER: ImportCategory[] = ["dividend", "p2p", "interest", "other"];

// ─── PDF slot ────────────────────────────────────────────────────────────

function FileSlot({ label, file, onFile, error, parsing }: {
  label: string; file: File | null;
  onFile: (f: File | null) => void;
  error?: string; parsing: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <button type="button" onClick={() => ref.current?.click()} disabled={parsing}
        className={cn("w-full flex items-center gap-2 rounded-xl border-2 border-dashed px-3 py-2.5 text-sm transition-colors",
          file ? "border-primary/40 bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")}>
        {file ? (
          <>
            <FileText className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate flex-1 text-left">{file.name}</span>
            <span role="button" tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onFile(null); }}
              onKeyDown={(e) => e.key === "Enter" && onFile(null)}
              className="text-muted-foreground hover:text-destructive">
              <X className="w-3.5 h-3.5" />
            </span>
          </>
        ) : (
          <><Upload className="w-4 h-4 shrink-0" /><span>Choose PDF</span></>
        )}
      </button>
      <input ref={ref} type="file" accept=".pdf,application/pdf" className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      {error && <p className="flex items-center gap-1.5 text-xs text-destructive"><AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}</p>}
    </div>
  );
}

// ─── Screenshot slot ──────────────────────────────────────────────────────

function ImageSlot({ label, files, onFiles, error, parsing }: {
  label: string; files: File[];
  onFiles: (f: File[]) => void;
  error?: string; parsing: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next = [...files];
    Array.from(incoming).forEach((f) => {
      if (!next.find((x) => x.name === f.name && x.size === f.size)) next.push(f);
    });
    onFiles(next);
  };
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <button type="button" onClick={() => ref.current?.click()} disabled={parsing}
        className={cn("w-full flex items-center gap-2 rounded-xl border-2 border-dashed px-3 py-2.5 text-sm transition-colors",
          files.length > 0 ? "border-primary/40 bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground")}>
        <Image className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left">{files.length > 0 ? `${files.length} screenshot${files.length > 1 ? "s" : ""}` : "Add screenshots"}</span>
        <Upload className="w-3.5 h-3.5 shrink-0 opacity-60" />
      </button>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => addFiles(e.target.files)} />
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="w-3 h-3 shrink-0" />
              <span className="truncate flex-1">{f.name}</span>
              <button type="button" onClick={() => onFiles(files.filter((_, idx) => idx !== i))} disabled={parsing}
                className="hover:text-destructive shrink-0"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="flex items-center gap-1.5 text-xs text-destructive"><AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}</p>}
    </div>
  );
}

// ─── Main sheet ───────────────────────────────────────────────────────────

export function BankImportSheet({ income, onApply, onClose }: Props) {
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  // Per-bank state: bankId → File (PDF) or File[] (screenshots)
  const [pdfFiles, setPdfFiles]     = useState<Record<string, File | null>>({});
  const [imgFiles, setImgFiles]     = useState<Record<string, File[]>>({});
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [parsing, setParsing]       = useState(false);
  const [transactions, setTransactions] = useState<ImportedTransaction[]>([]);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [parsed, setParsed]         = useState(false);

  useEffect(() => {
    getSettings().then(setAppSettings);
  }, []);

  const { profile, anthropicApiKey } = appSettings;
  const banks: BankConfig[] = profile.banks ?? [];
  const hasAnyFile = banks.some((b) =>
    b.importType === "pdf" ? !!pdfFiles[b.id] : (imgFiles[b.id]?.length ?? 0) > 0
  );

  const buildForm = (bank: BankConfig): FormData => {
    const form = new FormData();
    if (anthropicApiKey) form.append("apiKey", anthropicApiKey);
    form.append("userName",      profile.name ?? "");
    form.append("employerNames", JSON.stringify(profile.employerNames ?? []));
    form.append("skipKeywords",  JSON.stringify(profile.skipKeywords ?? []));
    if (bank.importType === "pdf") {
      const f = pdfFiles[bank.id];
      if (f) form.append("file", f);
    } else {
      (imgFiles[bank.id] ?? []).forEach((img) => form.append("images", img));
    }
    return form;
  };

  const parseBank = async (bank: BankConfig): Promise<ImportedTransaction[]> => {
    const form = buildForm(bank);
    const res  = await fetch("/api/bank-import", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Parse failed");
    return json.transactions as ImportedTransaction[];
  };

  const handleParse = async () => {
    if (!hasAnyFile) return;
    setParsing(true);
    setErrors({});
    setTransactions([]); setSelected(new Set()); setParsed(false);

    const activeBanks = banks.filter((b) =>
      b.importType === "pdf" ? !!pdfFiles[b.id] : (imgFiles[b.id]?.length ?? 0) > 0
    );

    const results = await Promise.allSettled(activeBanks.map((b) => parseBank(b)));

    const all: ImportedTransaction[] = [];
    const newErrors: Record<string, string> = {};
    results.forEach((r, i) => {
      if (r.status === "rejected") newErrors[activeBanks[i].id] = r.reason?.message ?? "Failed";
      else all.push(...r.value);
    });
    setErrors(newErrors);

    const deduped = all.filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i);
    setTransactions(deduped);
    setSelected(new Set(deduped.map((t) => t.id)));
    setParsed(true);
    setParsing(false);
  };

  const toggle = (id: string) =>
    setSelected((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleCategory = (cat: ImportCategory) => {
    const catIds = transactions.filter((t) => t.category === cat).map((t) => t.id);
    const allSelected = catIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const s = new Set(prev);
      catIds.forEach((id) => allSelected ? s.delete(id) : s.add(id));
      return s;
    });
  };

  const toApply = CATEGORY_ORDER.reduce<Partial<Record<keyof IncomeSection, number>>>((acc, cat) => {
    const field = CAT_META[cat].field;
    const sum = transactions
      .filter((t) => t.category === cat && selected.has(t.id))
      .reduce((s, t) => s + t.amount, 0);
    if (sum > 0) acc[field] = (acc[field] ?? 0) + Math.round(sum * 100);
    return acc;
  }, {});

  const handleApply = () => {
    const patch: Partial<IncomeSection> = {};
    for (const [field, paise] of Object.entries(toApply)) {
      const key = field as keyof IncomeSection;
      patch[key] = ((income[key] as number) ?? 0) + paise as never;
    }
    onApply(patch);
    onClose();
  };

  const hasSelections = selected.size > 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-background rounded-t-2xl border-t border-border max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-bold text-base">Import Bank Statements</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Extracts dividends, P2P income & interest automatically</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* No banks configured */}
          {banks.length === 0 && (
            <div className="rounded-xl bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              No banks configured. Add your banks in <strong>Settings → Bank Import Configuration</strong>.
            </div>
          )}

          {/* Bank slots */}
          {banks.length > 0 && (
            <div className={cn("gap-3", banks.length === 1 ? "flex flex-col" : "grid grid-cols-2")}>
              {banks.map((bank) =>
                bank.importType === "pdf" ? (
                  <FileSlot key={bank.id}
                    label={bank.name}
                    file={pdfFiles[bank.id] ?? null}
                    onFile={(f) => setPdfFiles((prev) => ({ ...prev, [bank.id]: f }))}
                    error={errors[bank.id]}
                    parsing={parsing} />
                ) : (
                  <ImageSlot key={bank.id}
                    label={bank.name}
                    files={imgFiles[bank.id] ?? []}
                    onFiles={(f) => setImgFiles((prev) => ({ ...prev, [bank.id]: f }))}
                    error={errors[bank.id]}
                    parsing={parsing} />
                )
              )}
            </div>
          )}

          {/* API key warning */}
          {!anthropicApiKey && banks.length > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              No API key set. Add it in Settings → API Key to enable parsing.
            </p>
          )}

          {/* Parse button */}
          {banks.length > 0 && (
            <Button onClick={handleParse} disabled={parsing || !hasAnyFile || !anthropicApiKey} className="w-full gap-2">
              {parsing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Parsing…</>
                : <><Upload className="w-4 h-4" /> {parsed ? "Re-parse Statements" : "Parse Statements"}</>}
            </Button>
          )}

          {/* Results */}
          {parsed && transactions.length === 0 && (
            <div className="rounded-xl bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
              No income transactions found in these statements.
            </div>
          )}

          {parsed && transactions.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Found {transactions.length} income transaction{transactions.length !== 1 ? "s" : ""}
              </p>
              {CATEGORY_ORDER.map((cat) => {
                const catTxns = transactions.filter((t) => t.category === cat);
                if (catTxns.length === 0) return null;
                const { label, color, Icon } = CAT_META[cat];
                const catTotal = catTxns.reduce((s, t) => s + t.amount, 0);
                const selectedTotal = catTxns.filter((t) => selected.has(t.id)).reduce((s, t) => s + t.amount, 0);
                const allCatSelected = catTxns.every((t) => selected.has(t.id));
                return (
                  <div key={cat} className="rounded-xl border border-border overflow-hidden">
                    <button type="button" onClick={() => toggleCategory(cat)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors">
                      {allCatSelected
                        ? <CheckSquare className={cn("w-4 h-4 shrink-0", color)} />
                        : <Square className="w-4 h-4 shrink-0 text-muted-foreground" />}
                      <Icon className={cn("w-4 h-4 shrink-0", color)} />
                      <span className="text-sm font-semibold flex-1 text-left">{label}</span>
                      <span className={cn("text-sm font-bold", color)}>
                        {formatINRCompact(Math.round(selectedTotal * 100))}
                        {selectedTotal !== catTotal && (
                          <span className="text-xs text-muted-foreground font-normal ml-1">
                            / {formatINRCompact(Math.round(catTotal * 100))}
                          </span>
                        )}
                      </span>
                    </button>
                    <div className="divide-y divide-border/40">
                      {catTxns.map((t) => (
                        <button key={t.id} type="button" onClick={() => toggle(t.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/20 transition-colors text-left">
                          {selected.has(t.id)
                            ? <CheckSquare className="w-4 h-4 shrink-0 text-primary" />
                            : <Square className="w-4 h-4 shrink-0 text-muted-foreground/40" />}
                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm truncate", !selected.has(t.id) && "text-muted-foreground")}>{t.description}</p>
                            <p className="text-xs text-muted-foreground">{t.date}</p>
                          </div>
                          <span className={cn("text-sm font-medium shrink-0", !selected.has(t.id) && "text-muted-foreground/50")}>
                            {formatINR(Math.round(t.amount * 100))}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Apply preview */}
          {hasSelections && Object.keys(toApply).length > 0 && (
            <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 space-y-1.5">
              <p className="text-xs font-semibold text-primary mb-2">Will add to your entry:</p>
              {(Object.entries(toApply) as [keyof IncomeSection, number][]).map(([field, paise]) => {
                const label = { dividend: "Dividend", passiveIncome: "Passive Income", interest: "Interest" }[field as string] ?? field;
                const existing = (income[field] as number) ?? 0;
                return (
                  <div key={field} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium">
                      {existing > 0 && <span className="text-muted-foreground text-xs mr-1">{formatINRCompact(existing)} +</span>}
                      <span className="text-primary">{formatINRCompact(paise)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] border-t border-border">
          <Button onClick={handleApply} disabled={!hasSelections || Object.keys(toApply).length === 0} className="w-full">
            Apply to Income Entry
          </Button>
        </div>
      </div>
    </div>
  );
}
