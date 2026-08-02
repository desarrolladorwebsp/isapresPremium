import { PremiumExecutiveShell } from "@/components/executive/premium-executive-shell";
import { ExecutiveOnboardingForm } from "@/components/executive/executive-onboarding-form";

export default function ExecutiveOnboardingPage() {
  return (
    <PremiumExecutiveShell variant="auth">
      <ExecutiveOnboardingForm />
    </PremiumExecutiveShell>
  );
}
