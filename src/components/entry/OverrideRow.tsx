"use client";
import React from "react";
import { CurrencyInput } from "./CurrencyInput";
import { formatINR, cn } from "@/lib/utils";
import { Check, Trash2 } from "lucide-react";

interface OverrideRowProps {
  id: string;
  label: string;
  defaultAmount: number; // paise
  actualAmount: number; // paise
  isOverridden: boolean;
  onChange: (paise: number) => void;
  isPaid?: boolean;
  onTogglePaid?: () => void;
  onRemove?: () => void;
  subLabel?: string;
  note?: string;
}

export function OverrideRow({
  id,
  label,
  defaultAmount,
  actualAmount,
  isOverridden,
  onChange,
  isPaid,
  onTogglePaid,
  onRemove,
  subLabel,
  note,
}: OverrideRowProps) {
  const handleReset = () => {
    onChange(defaultAmount);
  };

  return (
    <div className="flex items-start sm:items-center gap-3 py-3 border-b border-border/50 last:border-0">
      {/* Paid checkbox */}
      {onTogglePaid && (
        <button
          type="button"
          onClick={onTogglePaid}
          aria-label={isPaid ? "Mark as unpaid" : "Mark as paid"}
          className={cn(
            "mt-0.5 sm:mt-0 shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
            isPaid
              ? "bg-green-500 border-green-500"
              : "border-muted-foreground/40 hover:border-green-400"
          )}
        >
          {isPaid && <Check className="w-3.5 h-3.5 text-white" />}
        </button>
      )}
      {/* Label + input stacked column (grows to fill remaining space) */}
      <div className={cn("flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-1 min-w-0 overflow-hidden", isPaid && "opacity-60")}>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium truncate", isOverridden && "text-primary")}>
            {label}
          </p>
          {subLabel && (
            <p className="text-xs text-muted-foreground">{subLabel}</p>
          )}
          {note && (
            <p className="text-xs text-muted-foreground italic">{note}</p>
          )}
          {isOverridden && defaultAmount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-muted-foreground underline mt-0.5"
            >
              Reset to {formatINR(defaultAmount)}
            </button>
          )}
        </div>
        <div className="w-full sm:w-48 shrink-0 relative">
          <CurrencyInput
            id={`override-${id}`}
            value={actualAmount}
            onChange={onChange}
            size="default"
          />
        </div>
      </div>
      {/* Delete button */}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove row"
          className="shrink-0 p-1 text-muted-foreground/50 hover:text-destructive transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
