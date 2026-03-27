"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCcw, Save, TrendingUp } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MainHeader } from "@/components/navigation/MainHeader";

type DashboardPayload = {
    metrics: {
        totalLeadsReceived: number;
        leadsUnlockedInRange: number;
        conversionRate: number;
    };
    history: Array<{
        id: string;
        lead: string;
        area: string;
        status: "PENDING" | "CONTACTED" | "CONVERTED" | "LOST";
        date: string;
    }>;
    monthlyPerformance: Array<{
        month: string;
        leads: number;
    }>;
};

type LeadStatus = "PENDING" | "CONTACTED" | "CONVERTED" | "LOST";

type LeadRow = {
    id: string;
    name: string;
    email: string;
    phone: string;
    area: string;
    state: string;
    status: LeadStatus;
    unlockCount: number;
    createdAt: string;
};

type LeadsPayload = {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    leads: LeadRow[];
};

const statusOptions: Array<{ label: string; value: "" | LeadStatus }> = [
    { label: "Todos", value: "" },
    { label: "Pendente", value: "PENDING" },
    { label: "Contactado", value: "CONTACTED" },
    { label: "Convertido", value: "CONVERTED" },
    { label: "Perdido", value: "LOST" },
];

function toInputDate(date: Date) {
    return date.toISOString().slice(0, 10);
}

function statusBadgeClass(status: LeadStatus) {
    if (status === "CONTACTED") return "border-sky-300/30 bg-sky-400/10 text-sky-200";
    if (status === "CONVERTED") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";
    if (status === "LOST") return "border-rose-300/30 bg-rose-400/10 text-rose-200";
    return "border-amber-300/30 bg-amber-400/10 text-amber-200";
}

function formatDate(input: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(input));
}

export default function DashboardPage() {
    const [fromDate, setFromDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return toInputDate(date);
    });
    const [toDate, setToDate] = useState(() => toInputDate(new Date()));
    const [payload, setPayload] = useState<DashboardPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const [leadsPayload, setLeadsPayload] = useState<LeadsPayload | null>(null);
    const [leadsLoading, setLeadsLoading] = useState(true);
    const [leadsError, setLeadsError] = useState("");
    const [actionMessage, setActionMessage] = useState("");
    const [savingLeadId, setSavingLeadId] = useState<string | null>(null);

    const [area, setArea] = useState("");
    const [state, setState] = useState("");
    const [statusFilter, setStatusFilter] = useState<"" | LeadStatus>("");
    const [page, setPage] = useState(1);
    const [draftStatus, setDraftStatus] = useState<Record<string, LeadStatus>>({});

    const conversionRateText = useMemo(() => {
        if (!payload) return "0.0";
        return payload.metrics.conversionRate.toFixed(1);
    }, [payload]);

    const leads = useMemo(() => leadsPayload?.leads ?? [], [leadsPayload]);

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setErrorMessage("");

        try {
            const query = new URLSearchParams({
                from: fromDate,
                to: toDate,
            });

            const response = await fetch(`/api/dashboard/metrics?${query.toString()}`, {
                cache: "no-store",
            });

            if (!response.ok) {
                throw new Error("Falha ao carregar dashboard.");
            }

            const json = await response.json();
            setPayload(json as DashboardPayload);
        } catch {
            setErrorMessage("Não foi possível carregar os dados reais do dashboard.");
            setPayload(null);
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate]);

    const loadLeads = useCallback(async () => {
        setLeadsLoading(true);
        setLeadsError("");

        try {
            const query = new URLSearchParams({
                page: String(page),
                pageSize: "8",
            });

            if (area.trim()) query.set("area", area.trim());
            if (state.trim()) query.set("state", state.trim());
            if (statusFilter) query.set("status", statusFilter);

            const response = await fetch(`/api/leads?${query.toString()}`, {
                cache: "no-store",
            });

            if (!response.ok) {
                throw new Error("Falha ao carregar CRM.");
            }

            const json = await response.json();
            const normalized = json as LeadsPayload;
            setLeadsPayload(normalized);
            setDraftStatus(
                normalized.leads.reduce<Record<string, LeadStatus>>((acc, lead) => {
                    acc[lead.id] = lead.status;
                    return acc;
                }, {})
            );
        } catch {
            setLeadsError("Não foi possível carregar o CRM agora.");
            setLeadsPayload(null);
        } finally {
            setLeadsLoading(false);
        }
    }, [area, state, statusFilter, page]);

    const saveLeadStatus = useCallback(
        async (leadId: string) => {
            const nextStatus = draftStatus[leadId];
            if (!nextStatus) return;

            setSavingLeadId(leadId);
            setActionMessage("");

            try {
                const response = await fetch(`/api/leads/${leadId}/status`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ status: nextStatus }),
                });

                const json = await response.json();
                if (!response.ok || !json.success) {
                    throw new Error(json.message ?? "Falha ao atualizar status.");
                }

                setActionMessage("Status do lead atualizado.");
                await Promise.all([loadDashboard(), loadLeads()]);
            } catch (error) {
                const message = error instanceof Error ? error.message : "Erro ao salvar status.";
                setActionMessage(message);
            } finally {
                setSavingLeadId(null);
            }
        },
        [draftStatus, loadDashboard, loadLeads]
    );

    useEffect(() => {
        void loadDashboard();
    }, [loadDashboard]);

    useEffect(() => {
        void loadLeads();
    }, [loadLeads]);

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,#2b0a46_0%,#130022_55%)] pb-10 text-white">
            <MainHeader className="mb-1" />

            <section className="mx-auto max-w-7xl space-y-4 px-4 sm:px-6">
                <header className="rounded-3xl border border-white/15 bg-white/10 p-4 shadow-xl backdrop-blur">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">Dashboard do advogado</p>
                            <h1 className="mt-1 text-2xl font-black tracking-tight">Performance e CRM no mesmo painel</h1>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(event) => setFromDate(event.target.value)}
                                className="h-10 rounded-full border border-white/20 bg-white/10 px-3 text-sm"
                            />
                            <input
                                type="date"
                                value={toDate}
                                onChange={(event) => setToDate(event.target.value)}
                                className="h-10 rounded-full border border-white/20 bg-white/10 px-3 text-sm"
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    void loadDashboard();
                                    void loadLeads();
                                }}
                                className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-sm font-semibold hover:bg-white/15"
                            >
                                <RefreshCcw size={14} /> Atualizar
                            </button>
                        </div>
                    </div>
                </header>

                {errorMessage && (
                    <p className="rounded-xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                        {errorMessage}
                    </p>
                )}

                {loading && (
                    <p className="rounded-xl border border-sky-300/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-200">
                        Carregando métricas do dashboard...
                    </p>
                )}

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <article className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-sm backdrop-blur">
                        <p className="text-xs text-zinc-300">Total de leads recebidos</p>
                        <p className="mt-2 text-2xl font-black text-white">
                            {payload?.metrics.totalLeadsReceived ?? 0}
                        </p>
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-300">
                            <TrendingUp size={14} /> Dados reais no periodo selecionado
                        </p>
                    </article>
                    <article className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-sm backdrop-blur">
                        <p className="text-xs text-zinc-300">Leads desbloqueados</p>
                        <p className="mt-2 text-2xl font-black text-white">
                            {payload?.metrics.leadsUnlockedInRange ?? 0}
                        </p>
                    </article>
                    <article className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-sm backdrop-blur">
                        <p className="text-xs text-zinc-300">Taxa de conversão</p>
                        <div className="mt-3 flex items-center gap-3">
                            <div className="h-14 w-14 rounded-full border-4 border-[#e8472a] border-l-white/20" />
                            <p className="text-lg font-black text-white">{conversionRateText}%</p>
                        </div>
                    </article>
                    <article className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-sm backdrop-blur">
                        <p className="text-xs text-zinc-300">Atendente</p>
                        <select className="mt-2 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm">
                            <option>Todas</option>
                            <option>Equipe A</option>
                            <option>Equipe B</option>
                        </select>
                    </article>
                </div>

                <section className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-sm backdrop-blur">
                    <h2 className="text-sm font-semibold text-zinc-100">Desempenho mensal</h2>
                    <div className="mt-3 h-64 w-full">
                        <ResponsiveContainer>
                            <LineChart data={payload?.monthlyPerformance ?? []}>
                                <XAxis dataKey="month" stroke="#d4d4d8" />
                                <YAxis stroke="#d4d4d8" />
                                <Tooltip />
                                <Line type="monotone" dataKey="leads" stroke="#e8472a" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                <section className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-sm backdrop-blur">
                    <h2 className="text-sm font-semibold text-zinc-100">Histórico de contatos</h2>
                    <div className="mt-3 overflow-x-auto">
                        <table className="w-full min-w-135 text-left text-sm">
                            <thead>
                                <tr className="text-zinc-300">
                                    <th className="pb-2">Lead</th>
                                    <th className="pb-2">Área</th>
                                    <th className="pb-2">Status</th>
                                    <th className="pb-2">Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(payload?.history ?? []).map((row) => (
                                    <tr key={row.id} className="border-t border-white/10 text-zinc-100">
                                        <td className="py-2">{row.lead}</td>
                                        <td className="py-2">{row.area}</td>
                                        <td className="py-2">{row.status}</td>
                                        <td className="py-2">{formatDate(row.date)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {!loading && (payload?.history ?? []).length === 0 && (
                            <p className="mt-3 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-zinc-300">
                                Sem contatos para o periodo selecionado.
                            </p>
                        )}
                    </div>
                </section>

                <section className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-sm backdrop-blur">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-100">CRM de leads</h2>
                        <div className="grid gap-2 sm:grid-cols-4">
                            <input
                                value={area}
                                onChange={(event) => {
                                    setPage(1);
                                    setArea(event.target.value);
                                }}
                                placeholder="Área"
                                className="h-10 rounded-full border border-white/20 bg-white/10 px-3 text-sm"
                            />
                            <input
                                value={state}
                                onChange={(event) => {
                                    setPage(1);
                                    setState(event.target.value);
                                }}
                                placeholder="UF"
                                className="h-10 rounded-full border border-white/20 bg-white/10 px-3 text-sm"
                            />
                            <select
                                value={statusFilter}
                                onChange={(event) => {
                                    setPage(1);
                                    setStatusFilter(event.target.value as "" | LeadStatus);
                                }}
                                className="h-10 rounded-full border border-white/20 bg-white/10 px-3 text-sm"
                            >
                                {statusOptions.map((option) => (
                                    <option key={option.label} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => {
                                    setArea("");
                                    setState("");
                                    setStatusFilter("");
                                    setPage(1);
                                }}
                                className="h-10 rounded-full border border-white/20 bg-white/10 px-3 text-sm font-semibold hover:bg-white/15"
                            >
                                Limpar filtros
                            </button>
                        </div>
                    </div>

                    {leadsError && (
                        <p className="mt-3 rounded-xl border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
                            {leadsError}
                        </p>
                    )}

                    {actionMessage && (
                        <p className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
                            {actionMessage}
                        </p>
                    )}

                    {leadsLoading && (
                        <p className="mt-3 rounded-xl border border-sky-300/20 bg-sky-400/10 px-3 py-2 text-sm text-sky-200">
                            Carregando CRM...
                        </p>
                    )}

                    <div className="mt-3 overflow-x-auto">
                        <table className="w-full min-w-245 text-left text-sm">
                            <thead>
                                <tr className="border-b border-white/15 text-zinc-300">
                                    <th className="pb-2">Lead</th>
                                    <th className="pb-2">Area</th>
                                    <th className="pb-2">UF</th>
                                    <th className="pb-2">Status</th>
                                    <th className="pb-2">Desbloqueios</th>
                                    <th className="pb-2">Data</th>
                                    <th className="pb-2">Acao</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leads.map((lead) => (
                                    <tr key={lead.id} className="border-b border-white/10 text-zinc-100">
                                        <td className="py-2">
                                            <p className="font-semibold">{lead.name}</p>
                                            <p className="text-xs text-zinc-300">{lead.email}</p>
                                        </td>
                                        <td className="py-2">{lead.area}</td>
                                        <td className="py-2">{lead.state}</td>
                                        <td className="py-2">
                                            <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusBadgeClass(lead.status)}`}>
                                                {lead.status}
                                            </span>
                                        </td>
                                        <td className="py-2">{lead.unlockCount}</td>
                                        <td className="py-2 text-zinc-300">{formatDate(lead.createdAt)}</td>
                                        <td className="py-2">
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={draftStatus[lead.id] ?? lead.status}
                                                    onChange={(event) =>
                                                        setDraftStatus((current) => ({
                                                            ...current,
                                                            [lead.id]: event.target.value as LeadStatus,
                                                        }))
                                                    }
                                                    className="h-9 rounded-lg border border-white/20 bg-white/10 px-2 text-xs"
                                                >
                                                    {statusOptions
                                                        .filter((option) => option.value !== "")
                                                        .map((option) => (
                                                            <option key={option.label} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => void saveLeadStatus(lead.id)}
                                                    disabled={savingLeadId === lead.id}
                                                    className="inline-flex h-9 items-center gap-1 rounded-lg bg-[#e8472a] px-3 text-xs font-semibold text-white transition hover:bg-[#c73d22] disabled:opacity-50"
                                                >
                                                    <Save size={14} />
                                                    {savingLeadId === lead.id ? "Salvando" : "Salvar"}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {!leadsLoading && leads.length === 0 && (
                        <p className="mt-3 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-zinc-300">
                            Nenhum lead encontrado com os filtros atuais.
                        </p>
                    )}

                    <div className="mt-4 flex items-center justify-between text-sm text-zinc-300">
                        <p>
                            Página {leadsPayload?.page ?? page} de {leadsPayload?.totalPages ?? 1} | Total: {leadsPayload?.total ?? 0}
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setPage((current) => Math.max(1, current - 1))}
                                disabled={(leadsPayload?.page ?? page) <= 1}
                                className="h-9 rounded-full border border-white/20 bg-white/10 px-3 font-semibold disabled:opacity-40"
                            >
                                Anterior
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setPage((current) => {
                                        const totalPages = leadsPayload?.totalPages ?? 1;
                                        return current >= totalPages ? current : current + 1;
                                    })
                                }
                                disabled={(leadsPayload?.page ?? page) >= (leadsPayload?.totalPages ?? 1)}
                                className="h-9 rounded-full border border-white/20 bg-white/10 px-3 font-semibold disabled:opacity-40"
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                </section>
            </section>
        </main>
    );
}
