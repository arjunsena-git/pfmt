"use client";
import React, { useState, useRef } from "react";
import { cn, fromINR, toINR, parseRupeeInput } from "@/lib/utils";

interface CurrencyInputProps {
  value: number; // paise
  onChange: (paise: number) => void;
  placeholder?: string;
  className?: string;
  size?: "default" | "large";
  disabled?: boolean;
  id?: string;
  name?: string;
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = "0.00",
  className,
  size = "default",
  disabled = false,
  id,
  name,
}: CurrencyInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const displayValue = isFocused
    ? inputValue
    : value > 0
    ? (value / 100).toFixed(2)
    : "";

  const handleFocus = () => {
    setIsFocused(true);
    const rupeesStr = value > 0 ? (value / 100).toFixed(2) : "";
    setInputValue(rupeesStr);
    // Select all on focus for easy editing
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const handleBlur = () => {
    setIsFocused(false);
    const paise = parseRupeeInput(inputValue);
    onChange(paise);
    setInputValue("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and a single decimal point
    const raw = e.target.value.replace(/[^0-9.]/g, "");
    // Prevent multiple decimal points
    const parts = raw.split(".");
    const cleaned = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : raw;
    setInputValue(cleaned);
  };

  return (
    <div
      className={cn(
        "relative flex items-center rounded-xl border bg-background transition-colors overflow-hidden",
        isFocused ? "border-primary ring-2 ring-primary/20" : "border-input",
        disabled && "opacity-50 cursor-not-allowed",
        size === "large" ? "h-14" : "h-11",
        className
      )}
    >
      <span
        className={cn(
          "pl-2 sm:pl-3 text-muted-foreground select-none shrink-0",
          size === "large" ? "text-xl font-semibold" : "text-sm font-medium"
        )}
      >
        ₹
      </span>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        value={displayValue}
        placeholder={placeholder}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        className={cn(
          "flex-1 bg-transparent px-1 sm:px-2 py-2 focus:outline-none placeholder:text-muted-foreground/50 min-w-0",
          size === "large" ? "text-xl font-semibold" : "text-sm",
          "text-right pr-2 sm:pr-3"
        )}
      />
    </div>
  );
}
