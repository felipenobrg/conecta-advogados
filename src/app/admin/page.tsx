"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Eye, LogOut, RefreshCcw, Save } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Plan = "START" | "PRO" | "PREMIUM";
type SubStatus = "ACTIVE" | "CANCELED" | "PAST_DUE";

type UserRow = {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: "CLIENT" | "LAWYER" | "ADMIN";
    plan: Plan;
    subscriptionPlan: Plan | null;
    subscriptionStatus: SubStatus | null;
    subscriptionProvider: string | null;
    whatsappVerified: boolean;
    unlockCount: number;
    createdAt: string;
};

type AnalyticsPayload = {
    kpis: {
        revenueMonthlyEstimateInCents: number;
        activeUsers: number;
        lawyers: number;
        clients: number;
        activeSubscriptions: number;
        pendingLeads: number;
        unlocksToday: number;
    };
    charts: {
        unlocksTrend: Array<{ date: string; unlocks: number }>;
        planDistribution: Array<{ plan: string; users: number }>;
        subscriptionStatus: Array<{ status: string; total: number }>;
    };
};

type UserDetails = {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: "CLIENT" | "LAWYER" | "ADMIN";
    plan: Plan;
    planExpiresAt: string | null;
    whatsappVerified: boolean;
    createdAt: string;
    subscription: {
        id: string;
        provider: string;
        providerId: string;
        status: SubStatus;
        plan: Plan;
        createdAt: string;
    } | null;
    leadMetrics: {
        totalUnlocks: number;
    };
    leadHistory: Array<{
        unlockId: string;
        unlockedAt: string;
        leadId: string;
        leadName: string;
        area: string;
        status: "PENDING" | "CONTACTED" | "CONVERTED" | "LOST";
        leadCreatedAt: string;
    }>;
    financialHistory: Array<{
        type: string;
        status: string;
        provider: string;
        plan: string;
        amountInCents: number;
        date: string;
        note: string;
    }>;
};

const planOptions: Plan[] = ["START", "PRO", "PREMIUM"];
const chartColors = ["#e8472a", "#f97316", "#38bdf8", "#2dd4bf", "#a78bfa"];

function formatCurrency(amountInCents: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(amountInCents / 100);
}

function formatDate(dateInput: string | null) {
    if (!dateInput) return "-";
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(dateInput));
}

function badgeClassForStatus(status: string | null) {
    if (status === "ACTIVE") return "bg-emerald-400/10 text-emerald-200 border-emerald-300/30";
    if (status === "PAST_DUE") return "bg-amber-400/10 text-amber-200 border-amber-300/30";
    if (status === "CANCELED") return "bg-rose-400/10 text-rose-200 border-rose-300/30";
    return "bg-white/10 text-[#a89bc2] border-white/20";
}

export default function AdminPage() {
    const router = useRouter();
    const [users, setUsers] = useState<UserRow[]>([]);
    const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [infoMessage, setInfoMessage] = useState("");
    const [details, setDetails] = useState<UserDetails | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [savingUserId, setSavingUserId] = useState<string | null>(null);
    const [draftPlans, setDraftPlans] = useState<Record<string, Plan>>({});
    const [isSigningOut, setIsSigningOut] = useState(false);

    const usersFiltered = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return users;
        return users.filter((user) => {
            return (
                user.name.toLowerCase().includes(query) ||
                user.email.toLowerCase().includes(query) ||
                user.role.toLowerCase().includes(query) ||
                user.plan.toLowerCase().includes(query)
            );
        });
    }, [search, users]);

    async function loadAdminData() {
        setLoading(true);
        setErrorMessage("");

        try {
            const [usersRes, analyticsRes] = await Promise.all([
                fetch("/api/admin/users?limit=80", { cache: "no-store" }),
                fetch("/api/admin/analytics", { cache: "no-store" }),
            ]);

            if (!usersRes.ok || !analyticsRes.ok) {
                throw new Error("Falha ao carregar dados do admin.");
            }

            const usersJson = await usersRes.json();
            const analyticsJson = await analyticsRes.json();

            const loadedUsers = (usersJson.users ?? []) as UserRow[];
            setUsers(loadedUsers);
            setAnalytics(analyticsJson as AnalyticsPayload);

            setDraftPlans(
                loadedUsers.reduce<Record<string, Plan>>((accumulator, user) => {
                    accumulator[user.id] = user.plan;
                    return accumulator;
                }, {})
            );
        } catch {
            setErrorMessage("Não foi possível carregar o painel admin agora.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadAdminData();
    }, []);

    async function openDetails(userId: string) {
        setDetailsLoading(true);
        setInfoMessage("");

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                cache: "no-store",
            });

            if (!response.ok) {
                throw new Error("Erro ao carregar detalhes.");
            }

            const payload = await response.json();
            setDetails(payload.user as UserDetails);
        } catch {
            setInfoMessage("Falha ao carregar detalhes do usuário.");
        } finally {
            setDetailsLoading(false);
        }
    }

    async function savePlan(userId: string) {
        const plan = draftPlans[userId];
        if (!plan) return;

        setSavingUserId(userId);
        setInfoMessage("");

        try {
            const response = await fetch(`/api/admin/users/${userId}/plan`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ plan }),
            });

            const payload = await response.json();
            if (!response.ok || !payload.success) {
                throw new Error("Não foi possível atualizar plano.");
            }

            setUsers((current) =>
                current.map((entry) =>
                    entry.id === userId
                        ? {
                            ...entry,
                            plan,
                            subscriptionPlan: payload.subscription?.plan ?? plan,
                            subscriptionStatus: payload.subscription?.status ?? entry.subscriptionStatus,
                        }
                        : entry
                )
            );

            setDetails((current) => {
                if (!current || current.id !== userId) return current;
                return {
                    ...current,
                    plan,
                    subscription: current.subscription
                        ? { ...current.subscription, plan: payload.subscription?.plan ?? plan }
                        : current.subscription,
                };
            });

            setInfoMessage("Plano atualizado com sucesso.");
            void loadAdminData();
        } catch {
            setInfoMessage("Falha ao salvar o plano deste usuário.");
        } finally {
            setSavingUserId(null);
        }
    }

    async function handleLogout() {
        setIsSigningOut(true);
        setInfoMessage("");

        try {
            const supabase = createSupabaseBrowserClient();
            await supabase.auth.signOut();
            document.cookie = "app_role=; Path=/; Max-Age=0; SameSite=Lax";
            router.push("/auth");
            router.refresh();
        } catch {
            setInfoMessage("Não foi possível sair da conta agora.");
        } finally {
            setIsSigningOut(false);
        }
    }

    return (
        <AppShell title="Admin" className="pb-10">
            <section className="mx-auto max-w-7xl">
                <header className="rounded-3xl border border-[#3d2a5a] bg-[#231540]/90 p-5 shadow-xl backdrop-blur">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-white">Painel Admin Conecta</h1>
                            <p className="mt-1 text-sm text-[#a89bc2]">
                                Controle de usuários, assinatura, leads e receita com visão operacional completa.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => void loadAdminData()}
                                className="inline-flex h-11 items-center gap-2 rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-4 text-sm font-semibold text-[#a89bc2] transition hover:bg-[#2d1b4e]"
                            >
                                <RefreshCcw size={16} /> Atualizar dados
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleLogout()}
                                disabled={isSigningOut}
                                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#e8472a] px-5 text-sm font-semibold text-white transition hover:bg-[#c73d22] disabled:opacity-60"
                            >
                                <LogOut size={16} /> {isSigningOut ? "Saindo..." : "Sair da conta"}
                            </button>
                        </div>
                    </div>
                </header>

                {infoMessage && (
                    <p className="mt-3 rounded-xl border border-sky-300/30 bg-sky-400/10 px-4 py-3 text-sm text-sky-200">
                        {infoMessage}
                    </p>
                )}

                {errorMessage && (
                    <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                        {errorMessage}
                    </p>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <article className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/90 p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e8472a]">Receita estimada</p>
                        <p className="mt-2 text-2xl font-black text-white">
                            {formatCurrency(analytics?.kpis.revenueMonthlyEstimateInCents ?? 0)}
                        </p>
                    </article>
                    <article className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/90 p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a89bc2]">Usuários ativos</p>
                        <p className="mt-2 text-2xl font-black text-white">{analytics?.kpis.activeUsers ?? 0}</p>
                        <p className="mt-1 text-xs text-[#a89bc2]">
                            Advogados: {analytics?.kpis.lawyers ?? 0} | Clientes: {analytics?.kpis.clients ?? 0}
                        </p>
                    </article>
                    <article className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/90 p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a89bc2]">Assinaturas ativas</p>
                        <p className="mt-2 text-2xl font-black text-white">{analytics?.kpis.activeSubscriptions ?? 0}</p>
                    </article>
                    <article className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/90 p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#a89bc2]">Leads operacionais</p>
                        <p className="mt-2 text-2xl font-black text-white">{analytics?.kpis.pendingLeads ?? 0}</p>
                        <p className="mt-1 text-xs text-[#a89bc2]">Desbloqueios hoje: {analytics?.kpis.unlocksToday ?? 0}</p>
                    </article>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
                    <section className="rounded-3xl border border-[#3d2a5a] bg-[#231540]/90 p-4 shadow-sm">
                        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#a89bc2]">Desbloqueios nos últimos 14 dias</h2>
                        <div className="mt-3 h-72 w-full">
                            <ResponsiveContainer>
                                <LineChart data={analytics?.charts.unlocksTrend ?? []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#3d2a5a" />
                                    <XAxis dataKey="date" stroke="#a89bc2" tick={{ fontSize: 12 }} />
                                    <YAxis stroke="#a89bc2" tick={{ fontSize: 12 }} allowDecimals={false} />
                                    <Tooltip />
                                    <Line
                                        type="monotone"
                                        dataKey="unlocks"
                                        stroke="#e8472a"
                                        strokeWidth={3}
                                        dot={{ r: 3, fill: "#e8472a" }}
                                        activeDot={{ r: 5 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                        <article className="rounded-3xl border border-[#3d2a5a] bg-[#231540]/90 p-4 shadow-sm">
                            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#a89bc2]">Distribuição por plano</h2>
                            <div className="mt-3 h-56">
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={analytics?.charts.planDistribution ?? []}
                                            dataKey="users"
                                            nameKey="plan"
                                            innerRadius={55}
                                            outerRadius={85}
                                        >
                                            {(analytics?.charts.planDistribution ?? []).map((entry, index) => (
                                                <Cell key={`${entry.plan}-${index}`} fill={chartColors[index % chartColors.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </article>

                        <article className="rounded-3xl border border-[#3d2a5a] bg-[#231540]/90 p-4 shadow-sm">
                            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#a89bc2]">Status de assinatura</h2>
                            <div className="mt-3 h-56">
                                <ResponsiveContainer>
                                    <BarChart data={analytics?.charts.subscriptionStatus ?? []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#3d2a5a" />
                                        <XAxis dataKey="status" stroke="#a89bc2" tick={{ fontSize: 12 }} />
                                        <YAxis allowDecimals={false} stroke="#a89bc2" tick={{ fontSize: 12 }} />
                                        <Tooltip />
                                        <Bar dataKey="total" fill="#e8472a" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </article>
                    </section>
                </div>

                <section className="mt-4 rounded-3xl border border-[#3d2a5a] bg-[#231540]/90 p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-[#a89bc2]">Usuários e planos</h2>
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar por nome, email, role ou plano"
                            className="h-10 w-full rounded-xl border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-sm text-white outline-none placeholder:text-[#a89bc2] focus:border-[#e8472a] sm:w-80"
                        />
                    </div>

                    <div className="mt-3 overflow-x-auto">
                        <table className="w-full min-w-245 text-left text-sm">
                            <thead>
                                <tr className="border-b border-white/15 text-xs uppercase tracking-[0.12em] text-[#a89bc2]">
                                    <th className="py-3">Usuário</th>
                                    <th className="py-3">Contato</th>
                                    <th className="py-3">Role</th>
                                    <th className="py-3">Plano</th>
                                    <th className="py-3">Assinatura</th>
                                    <th className="py-3">Desbloqueios</th>
                                    <th className="py-3">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usersFiltered.map((user) => (
                                    <tr key={user.id} className="border-b border-white/10 text-zinc-100">
                                        <td className="py-3 align-top">
                                            <p className="font-semibold text-white">{user.name}</p>
                                            <p className="text-xs text-[#a89bc2]">Criado em {formatDate(user.createdAt)}</p>
                                        </td>
                                        <td className="py-3 align-top">
                                            <p>{user.email}</p>
                                            <p className="text-xs text-[#a89bc2]">{user.phone}</p>
                                        </td>
                                        <td className="py-3 align-top">
                                            <span className="rounded-full border border-white/20 bg-white/5 px-2 py-1 text-xs font-semibold text-[#a89bc2]">
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="py-3 align-top">
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={draftPlans[user.id] ?? user.plan}
                                                    onChange={(event) => {
                                                        const selectedPlan = event.target.value as Plan;
                                                        setDraftPlans((current) => ({
                                                            ...current,
                                                            [user.id]: selectedPlan,
                                                        }));
                                                    }}
                                                    className="h-9 rounded-lg border border-[#3d2a5a] bg-[#1a0a2e] px-2 text-xs font-semibold text-white"
                                                >
                                                    {planOptions.map((plan) => (
                                                        <option key={plan} value={plan}>
                                                            {plan}
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => void savePlan(user.id)}
                                                    disabled={savingUserId === user.id}
                                                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#e8472a] px-3 text-xs font-semibold text-white transition hover:bg-[#c73d22] disabled:opacity-60"
                                                >
                                                    <Save size={14} />
                                                    {savingUserId === user.id ? "Salvando" : "Salvar"}
                                                </button>
                                            </div>
                                        </td>
                                        <td className="py-3 align-top">
                                            <span
                                                className={`rounded-full border px-2 py-1 text-xs font-semibold ${badgeClassForStatus(
                                                    user.subscriptionStatus
                                                )}`}
                                            >
                                                {user.subscriptionStatus ?? "SEM_ASSINATURA"}
                                            </span>
                                        </td>
                                        <td className="py-3 align-top">{user.unlockCount}</td>
                                        <td className="py-3 align-top">
                                            <button
                                                type="button"
                                                onClick={() => void openDetails(user.id)}
                                                className="inline-flex h-9 items-center gap-1 rounded-lg border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-xs font-semibold text-[#a89bc2] transition hover:bg-[#2d1b4e]"
                                            >
                                                <Eye size={14} /> Ver detalhes
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {!loading && usersFiltered.length === 0 && (
                        <p className="mt-4 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-[#a89bc2]">
                            Nenhum usuário encontrado para os filtros atuais.
                        </p>
                    )}

                    {loading && (
                        <p className="mt-4 rounded-xl border border-sky-300/30 bg-sky-400/10 px-4 py-3 text-sm text-sky-200">
                            Carregando dados administrativos...
                        </p>
                    )}
                </section>
            </section>

            {details && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-3 sm:items-center">
                    <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-3xl border border-[#3d2a5a] bg-[#231540] p-4 text-white shadow-2xl sm:p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-xl font-black text-white">Detalhes de {details.name}</h3>
                                <p className="text-sm text-[#a89bc2]">Visão completa para gestão operacional da conta.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDetails(null)}
                                className="rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-3 py-1 text-xs font-semibold text-[#a89bc2]"
                            >
                                Fechar
                            </button>
                        </div>

                        {detailsLoading ? (
                            <p className="mt-4 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-[#a89bc2]">
                                Carregando detalhes...
                            </p>
                        ) : (
                            <div className="mt-4 grid gap-4">
                                <section className="rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e]/60 p-4">
                                    <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-[#a89bc2]">Dados cadastrais</h4>
                                    <div className="mt-3 grid gap-2 text-sm text-zinc-100 sm:grid-cols-2">
                                        <p><strong>Nome:</strong> {details.name}</p>
                                        <p><strong>Email:</strong> {details.email}</p>
                                        <p><strong>Telefone:</strong> {details.phone}</p>
                                        <p><strong>Role:</strong> {details.role}</p>
                                        <p><strong>Plano atual:</strong> {details.plan}</p>
                                        <p><strong>WhatsApp validado:</strong> {details.whatsappVerified ? "Sim" : "Não"}</p>
                                    </div>
                                </section>

                                <section className="rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e]/60 p-4">
                                    <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-[#a89bc2]">Assinatura</h4>
                                    {details.subscription ? (
                                        <div className="mt-3 grid gap-2 text-sm text-zinc-100 sm:grid-cols-2">
                                            <p><strong>Provider:</strong> {details.subscription.provider}</p>
                                            <p><strong>Status:</strong> {details.subscription.status}</p>
                                            <p><strong>Plano:</strong> {details.subscription.plan}</p>
                                            <p><strong>Criada em:</strong> {formatDate(details.subscription.createdAt)}</p>
                                        </div>
                                    ) : (
                                        <p className="mt-3 text-sm text-[#a89bc2]">Usuário sem assinatura registrada.</p>
                                    )}
                                </section>

                                <section className="rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e]/60 p-4">
                                    <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-[#a89bc2]">Leads e desbloqueios</h4>
                                    <p className="mt-2 text-sm text-zinc-100">Total de desbloqueios: {details.leadMetrics.totalUnlocks}</p>
                                    <div className="mt-2 max-h-48 overflow-auto rounded-xl border border-white/15">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-white/10 bg-white/5 text-[#a89bc2]">
                                                    <th className="px-3 py-2">Lead</th>
                                                    <th className="px-3 py-2">Área</th>
                                                    <th className="px-3 py-2">Status</th>
                                                    <th className="px-3 py-2">Desbloqueado em</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {details.leadHistory.map((item) => (
                                                    <tr key={item.unlockId} className="border-b border-white/10 text-zinc-100">
                                                        <td className="px-3 py-2">{item.leadName}</td>
                                                        <td className="px-3 py-2">{item.area}</td>
                                                        <td className="px-3 py-2">{item.status}</td>
                                                        <td className="px-3 py-2">{formatDate(item.unlockedAt)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>

                                <section className="rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e]/60 p-4">
                                    <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-[#a89bc2]">Histórico financeiro</h4>
                                    {details.financialHistory.length === 0 ? (
                                        <p className="mt-2 text-sm text-[#a89bc2]">Sem eventos financeiros detalhados para esta conta.</p>
                                    ) : (
                                        <ul className="mt-2 space-y-2 text-sm text-zinc-100">
                                            {details.financialHistory.map((event, index) => (
                                                <li key={`${event.type}-${index}`} className="rounded-xl border border-white/10 bg-white/5 p-3">
                                                    <p className="font-semibold text-white">
                                                        {event.plan} | {event.status} | {formatCurrency(event.amountInCents)}
                                                    </p>
                                                    <p className="text-xs text-[#a89bc2]">{formatDate(event.date)} | {event.provider}</p>
                                                    <p className="mt-1 text-xs text-[#a89bc2]">{event.note}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </section>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </AppShell>
    );
}
