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
import { MainHeader } from "@/components/navigation/MainHeader";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Plan = "START" | "PRO" | "PRIMUM";
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

const planOptions: Plan[] = ["START", "PRO", "PRIMUM"];
const chartColors = ["#ef4444", "#f97316", "#0ea5e9", "#14b8a6", "#a855f7"];

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
    if (status === "ACTIVE") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (status === "PAST_DUE") return "bg-amber-100 text-amber-700 border-amber-200";
    if (status === "CANCELED") return "bg-rose-100 text-rose-700 border-rose-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
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
            setErrorMessage("Nao foi possivel carregar o painel admin agora.");
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
            setInfoMessage("Falha ao carregar detalhes do usuario.");
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
                throw new Error("Nao foi possivel atualizar plano.");
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
            setInfoMessage("Falha ao salvar o plano deste usuario.");
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
            setInfoMessage("Nao foi possivel sair da conta agora.");
        } finally {
            setIsSigningOut(false);
        }
    }

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_12%_10%,#fff3e9_0%,#f8fafc_45%,#e2e8f0_100%)] pb-10">
            <MainHeader variant="light" className="mb-2" />

            <section className="mx-auto max-w-7xl px-4 sm:px-6">
                <header className="rounded-3xl border border-orange-100 bg-white/90 p-5 shadow-[0_26px_80px_-60px_rgba(234,88,12,0.75)] backdrop-blur">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-slate-900">Painel Admin Conecta</h1>
                            <p className="mt-1 text-sm text-slate-600">
                                Controle de usuarios, assinatura, leads e receita com visao operacional completa.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => void loadAdminData()}
                                className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                                <RefreshCcw size={16} /> Atualizar dados
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleLogout()}
                                disabled={isSigningOut}
                                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#ff453a] px-5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                            >
                                <LogOut size={16} /> {isSigningOut ? "Saindo..." : "Sair da conta"}
                            </button>
                        </div>
                    </div>
                </header>

                {infoMessage && (
                    <p className="mt-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                        {infoMessage}
                    </p>
                )}

                {errorMessage && (
                    <p className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {errorMessage}
                    </p>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <article className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Receita estimada</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">
                            {formatCurrency(analytics?.kpis.revenueMonthlyEstimateInCents ?? 0)}
                        </p>
                    </article>
                    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Usuarios ativos</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">{analytics?.kpis.activeUsers ?? 0}</p>
                        <p className="mt-1 text-xs text-slate-500">
                            Advogados: {analytics?.kpis.lawyers ?? 0} | Clientes: {analytics?.kpis.clients ?? 0}
                        </p>
                    </article>
                    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Assinaturas ativas</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">{analytics?.kpis.activeSubscriptions ?? 0}</p>
                    </article>
                    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Leads operacionais</p>
                        <p className="mt-2 text-2xl font-black text-slate-900">{analytics?.kpis.pendingLeads ?? 0}</p>
                        <p className="mt-1 text-xs text-slate-500">Desbloqueios hoje: {analytics?.kpis.unlocksToday ?? 0}</p>
                    </article>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
                    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Desbloqueios nos ultimos 14 dias</h2>
                        <div className="mt-3 h-72 w-full">
                            <ResponsiveContainer>
                                <LineChart data={analytics?.charts.unlocksTrend ?? []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="date" stroke="#475569" tick={{ fontSize: 12 }} />
                                    <YAxis stroke="#475569" tick={{ fontSize: 12 }} allowDecimals={false} />
                                    <Tooltip />
                                    <Line
                                        type="monotone"
                                        dataKey="unlocks"
                                        stroke="#f97316"
                                        strokeWidth={3}
                                        dot={{ r: 3, fill: "#ea580c" }}
                                        activeDot={{ r: 5 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                        <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Distribuicao por plano</h2>
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

                        <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Status de assinatura</h2>
                            <div className="mt-3 h-56">
                                <ResponsiveContainer>
                                    <BarChart data={analytics?.charts.subscriptionStatus ?? []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="status" stroke="#475569" tick={{ fontSize: 12 }} />
                                        <YAxis allowDecimals={false} stroke="#475569" tick={{ fontSize: 12 }} />
                                        <Tooltip />
                                        <Bar dataKey="total" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </article>
                    </section>
                </div>

                <section className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-500">Usuarios e planos</h2>
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Buscar por nome, email, role ou plano"
                            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-500 sm:w-80"
                        />
                    </div>

                    <div className="mt-3 overflow-x-auto">
                        <table className="w-full min-w-245 text-left text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500">
                                    <th className="py-3">Usuario</th>
                                    <th className="py-3">Contato</th>
                                    <th className="py-3">Role</th>
                                    <th className="py-3">Plano</th>
                                    <th className="py-3">Assinatura</th>
                                    <th className="py-3">Desbloqueios</th>
                                    <th className="py-3">Acoes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usersFiltered.map((user) => (
                                    <tr key={user.id} className="border-b border-slate-100 text-slate-700">
                                        <td className="py-3 align-top">
                                            <p className="font-semibold text-slate-900">{user.name}</p>
                                            <p className="text-xs text-slate-500">Criado em {formatDate(user.createdAt)}</p>
                                        </td>
                                        <td className="py-3 align-top">
                                            <p>{user.email}</p>
                                            <p className="text-xs text-slate-500">{user.phone}</p>
                                        </td>
                                        <td className="py-3 align-top">
                                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold">
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
                                                    className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700"
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
                                                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-orange-500 px-3 text-xs font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
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
                                                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
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
                        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                            Nenhum usuario encontrado para os filtros atuais.
                        </p>
                    )}

                    {loading && (
                        <p className="mt-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                            Carregando dados administrativos...
                        </p>
                    )}
                </section>
            </section>

            {details && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-3 sm:items-center">
                    <div className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h3 className="text-xl font-black text-slate-900">Detalhes de {details.name}</h3>
                                <p className="text-sm text-slate-600">Visao completa para gestao operacional da conta.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDetails(null)}
                                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600"
                            >
                                Fechar
                            </button>
                        </div>

                        {detailsLoading ? (
                            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                Carregando detalhes...
                            </p>
                        ) : (
                            <div className="mt-4 grid gap-4">
                                <section className="rounded-2xl border border-slate-200 p-4">
                                    <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Dados cadastrais</h4>
                                    <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                                        <p><strong>Nome:</strong> {details.name}</p>
                                        <p><strong>Email:</strong> {details.email}</p>
                                        <p><strong>Telefone:</strong> {details.phone}</p>
                                        <p><strong>Role:</strong> {details.role}</p>
                                        <p><strong>Plano atual:</strong> {details.plan}</p>
                                        <p><strong>WhatsApp validado:</strong> {details.whatsappVerified ? "Sim" : "Nao"}</p>
                                    </div>
                                </section>

                                <section className="rounded-2xl border border-slate-200 p-4">
                                    <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Assinatura</h4>
                                    {details.subscription ? (
                                        <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                                            <p><strong>Provider:</strong> {details.subscription.provider}</p>
                                            <p><strong>Status:</strong> {details.subscription.status}</p>
                                            <p><strong>Plano:</strong> {details.subscription.plan}</p>
                                            <p><strong>Criada em:</strong> {formatDate(details.subscription.createdAt)}</p>
                                        </div>
                                    ) : (
                                        <p className="mt-3 text-sm text-slate-600">Usuario sem assinatura registrada.</p>
                                    )}
                                </section>

                                <section className="rounded-2xl border border-slate-200 p-4">
                                    <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Leads e desbloqueios</h4>
                                    <p className="mt-2 text-sm text-slate-700">Total de desbloqueios: {details.leadMetrics.totalUnlocks}</p>
                                    <div className="mt-2 max-h-48 overflow-auto rounded-xl border border-slate-100">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-100 bg-slate-50 text-slate-500">
                                                    <th className="px-3 py-2">Lead</th>
                                                    <th className="px-3 py-2">Area</th>
                                                    <th className="px-3 py-2">Status</th>
                                                    <th className="px-3 py-2">Desbloqueado em</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {details.leadHistory.map((item) => (
                                                    <tr key={item.unlockId} className="border-b border-slate-100 text-slate-700">
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

                                <section className="rounded-2xl border border-slate-200 p-4">
                                    <h4 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Historico financeiro</h4>
                                    {details.financialHistory.length === 0 ? (
                                        <p className="mt-2 text-sm text-slate-600">Sem eventos financeiros detalhados para esta conta.</p>
                                    ) : (
                                        <ul className="mt-2 space-y-2 text-sm text-slate-700">
                                            {details.financialHistory.map((event, index) => (
                                                <li key={`${event.type}-${index}`} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                                    <p className="font-semibold text-slate-900">
                                                        {event.plan} | {event.status} | {formatCurrency(event.amountInCents)}
                                                    </p>
                                                    <p className="text-xs text-slate-500">{formatDate(event.date)} | {event.provider}</p>
                                                    <p className="mt-1 text-xs text-slate-600">{event.note}</p>
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
        </main>
    );
}
