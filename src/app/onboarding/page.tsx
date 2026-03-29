import { OnboardingChat } from "@/components/onboarding/OnboardingChat";
import { AppShell } from "@/components/navigation/AppShell";
import { redirect } from "next/navigation";

type OnboardingPageProps = {
    searchParams: Promise<{
        role?: string | string[];
        entry?: string | string[];
    }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
    const params = await searchParams;
    const roleRaw = Array.isArray(params.role) ? params.role[0] : params.role;
    const entryRaw = Array.isArray(params.entry) ? params.entry[0] : params.entry;
    if (roleRaw === "CLIENT") {
        redirect("/leads/inscricao");
    }

    const initialRole = "LAWYER";
    const initialEntry = entryRaw === "leads" ? "leads" : undefined;

    return (
        <AppShell title="Onboarding" showSidebar={false}>
            <OnboardingChat initialRole={initialRole} initialEntry={initialEntry} />
        </AppShell>
    );
}
