"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { EntryWizard } from "@/components/entry/EntryWizard";

function EntryPageContent() {
  const searchParams = useSearchParams();
  const month = searchParams.get("month") ?? undefined;

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold pt-2">New Entry</h1>
      <EntryWizard monthId={month} />
    </div>
  );
}

export default function EntryPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    }>
      <EntryPageContent />
    </Suspense>
  );
}
