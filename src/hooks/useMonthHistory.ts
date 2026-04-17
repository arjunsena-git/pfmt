"use client";
import { useState, useEffect } from "react";
import type { MonthlyEntry } from "@/types/finance";
import { getAllMonthEntries } from "@/lib/db/queries";

export function useMonthHistory() {
  const [entries, setEntries] = useState<MonthlyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    setIsLoading(true);
    try {
      const all = await getAllMonthEntries();
      setEntries(all);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return { entries, isLoading, reload: load };
}
