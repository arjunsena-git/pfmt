"use client";
import React, { useRef, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FormProgress } from "./FormProgress";
import { Step0_SalaryDate } from "./steps/Step0_SalaryDate";
import { Step1_Income } from "./steps/Step1_Income";
import { Step2_Expenses } from "./steps/Step2_Expenses";
import { Step3_Savings } from "./steps/Step3_Savings";
import { Step4_Freelance } from "./steps/Step4_Freelance";
import { Step5_Review } from "./steps/Step5_Review";
import { Button } from "@/components/ui/button";
import { useMonthEntry } from "@/hooks/useMonthEntry";
import { DEFAULT_FREELANCE_SOURCES } from "@/lib/defaults";
import { getSettings } from "@/lib/db/queries";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";

interface EntryWizardProps {
  monthId?: string;
}

export function EntryWizard({ monthId }: EntryWizardProps) {
  const router = useRouter();
  const { data, currentStep, isLoading, isSaving, updateData, nextStep, prevStep, save } =
    useMonthEntry(monthId);
  const [freelanceEnabled, setFreelanceEnabled] = useState(false);

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  useEffect(() => {
    getSettings().then((s) => setFreelanceEnabled(s.profile?.freelanceEnabled ?? false));
  }, []);

  // When freelance is disabled, step 4 is skipped — total steps = 5 (0-3 + review=4)
  const totalSteps = freelanceEnabled ? 5 : 4;
  // Map wizard currentStep to actual component step (skip step 4 when no freelance)
  const resolvedStep = (!freelanceEnabled && currentStep >= 4) ? currentStep + 1 : currentStep;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0 && currentStep < totalSteps) nextStep();
      else if (diffX < 0 && currentStep > 0) prevStep();
    }
  };

  const handleSave = async () => {
    const entry = await save();
    if (entry) router.push("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)]">
      <FormProgress currentStep={currentStep} totalSteps={totalSteps + 1} />

      <div className="flex-1 overflow-y-auto" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {resolvedStep === 0 && <Step0_SalaryDate data={data} onUpdate={updateData} />}
        {resolvedStep === 1 && <Step1_Income data={data} onUpdate={updateData} />}
        {resolvedStep === 2 && <Step2_Expenses data={data} onUpdate={updateData} />}
        {resolvedStep === 3 && <Step3_Savings data={data} onUpdate={updateData} />}
        {resolvedStep === 4 && freelanceEnabled && (
          <Step4_Freelance data={data} onUpdate={updateData} defaultSources={DEFAULT_FREELANCE_SOURCES} />
        )}
        {resolvedStep === 5 && <Step5_Review data={data} />}
      </div>

      <div className="sticky bottom-0 bg-background border-t border-border pt-4 pb-safe mt-4">
        <div className="flex gap-3">
          {currentStep > 0 && (
            <Button type="button" variant="outline" onClick={prevStep} className="flex-1 gap-2">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          )}
          {currentStep < totalSteps ? (
            <Button type="button" onClick={nextStep} className="flex-1 gap-2">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button type="button" onClick={handleSave} disabled={isSaving} variant="success" className="flex-1 gap-2">
              {isSaving
                ? <div className="animate-spin w-4 h-4 rounded-full border-2 border-white border-t-transparent" />
                : <Save className="w-4 h-4" />}
              {isSaving ? "Saving…" : "Save Entry"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
