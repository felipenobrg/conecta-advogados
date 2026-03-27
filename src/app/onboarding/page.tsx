import { OnboardingChat } from "@/components/onboarding/OnboardingChat";
import { MainHeader } from "@/components/navigation/MainHeader";

type OnboardingPageProps = {
  searchParams: Promise<{
    role?: string | string[];
  }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await searchParams;
  const roleRaw = Array.isArray(params.role) ? params.role[0] : params.role;
  const initialRole =
    roleRaw === "LAWYER" || roleRaw === "CLIENT" ? roleRaw : undefined;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fafc_55%)]">
      <MainHeader variant="light" />
      <OnboardingChat initialRole={initialRole} />
    </main>
  );
}
