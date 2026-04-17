"use client";
import React from "react";
import { cn } from "@/lib/utils";

const ALL_STEPS = [
  { label: "Date" },
  { label: "Income" },
  { label: "Expenses" },
  { label: "Savings" },
  { label: "Freelance" },
  { label: "Review" },
];

// Without freelance: Date, Income, Expenses, Savings, Review
const STEPS_NO_FREELANCE = [
  { label: "Date" },
  { label: "Income" },
  { label: "Expenses" },
  { label: "Savings" },
  { label: "Review" },
];

interface FormProgressProps {
  currentStep: number;
  totalSteps?: number; // 6 with freelance, 5 without
}

export function FormProgress({ currentStep, totalSteps = 6 }: FormProgressProps) {
  const steps = totalSteps === 5 ? STEPS_NO_FREELANCE : ALL_STEPS;

  return (
    <div className="flex items-center justify-between px-1 mb-6">
      {steps.map((step, index) => (
        <React.Fragment key={index}>
          <div className="flex flex-col items-center gap-1">
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
              index < currentStep
                ? "bg-primary text-primary-foreground"
                : index === currentStep
                ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                : "bg-muted text-muted-foreground"
            )}>
              {index < currentStep ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <span className={cn("text-[10px] font-medium hidden sm:block",
              index === currentStep ? "text-primary" : "text-muted-foreground")}>
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={cn("flex-1 h-0.5 mx-1 transition-all", index < currentStep ? "bg-primary" : "bg-muted")} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
