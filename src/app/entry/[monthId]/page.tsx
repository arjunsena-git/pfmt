"use client";
import { use } from "react";
import { EntryWizard } from "@/components/entry/EntryWizard";
import { getMonthLabel } from "@/lib/utils";

export default function EditEntryPage({ params }: { params: Promise<{ monthId: string }> }) {
  const { monthId } = use(params);

  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold pt-2">Edit — {getMonthLabel(monthId)}</h1>
      <EntryWizard monthId={monthId} />
    </div>
  );
}
