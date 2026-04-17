"use client";
import React from "react";

interface Props {
  rate: number; // 0-100
}

export function SavingsRateGauge({ rate }: Props) {
  const clampedRate = Math.min(100, Math.max(0, rate));
  const radius = 54;
  const circumference = Math.PI * radius; // half circle
  const offset = circumference - (clampedRate / 100) * circumference;

  const color =
    clampedRate >= 40 ? "#22c55e" :
    clampedRate >= 25 ? "#eab308" :
    "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-20 overflow-hidden">
        <svg viewBox="0 0 120 68" className="w-full h-full">
          {/* Background arc */}
          <path
            d="M 8 60 A 52 52 0 0 1 112 60"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d="M 8 60 A 52 52 0 0 1 112 60"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={`${offset}`}
            style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease" }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-1">
          <span className="text-2xl font-bold leading-none" style={{ color }}>
            {clampedRate.toFixed(1)}%
          </span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground font-medium mt-1">Savings Rate</span>
    </div>
  );
}
