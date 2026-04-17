"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSettings } from "@/lib/db/queries";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default function Home() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "onboarding" | "ready">("loading");

  useEffect(() => {
    getSettings().then((s) => {
      if (s.profile?.onboardingComplete) {
        router.replace("/dashboard");
      } else {
        setState("onboarding");
      }
    });
  }, [router]);

  if (state === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (state === "onboarding") {
    return <OnboardingWizard onComplete={() => router.replace("/dashboard")} />;
  }

  return null;
}
