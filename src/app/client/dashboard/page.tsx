"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/navigation/AppShell";

type LeadStatus = "PENDING" | "CONTACTED" | "CONVERTED" | "LOST";

type LeadRow = {
    id: string;
    name: string;
    email: string;
    phone: string;
    area: string;
    state: string;
    status: LeadStatus;
    createdAt: string;
};

type LeadsResponse = {
    total: number;
    leads: LeadRow[];
};

const initialForm = {
    name: "",
    email: "",
    phone: "",
    area: "",
    state: "",
};

function formatDate(input: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    }).format(new Date(input));
}

function statusBadgeClass(status: LeadStatus) {
    if (status === "CONVERTED") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";
    if (status === "CONTACTED") return "border-sky-300/30 bg-sky-400/10 text-sky-200";
    if (status === "LOST") return "border-rose-300/30 bg-rose-400/10 text-rose-200";
    return "border-amber-300/30 bg-amber-400/10 text-amber-200";
}

export default function ClientDashboardPage() {
    const [form, setForm] = useState(initialForm);
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [payload, setPayload] = useState<LeadsResponse | null>(null);

    const leads = useMemo(() => payload?.leads ?? [], [payload]);

    const counters = useMemo(() => {
        const total = leads.length;
        const pending = leads.filter((lead) => lead.status === "PENDING").length;
        const contacted = leads.filter((lead) => lead.status === "CONTACTED").length;
        const converted = leads.filter((lead) => lead.status === "CONVERTED").length;
        return { total, pending, contacted, converted };
    }, [leads]);

    const loadLeads = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/leads?page=1&pageSize=30", {
                cache: "no-store",
            });

            if (!response.ok) {
                throw new Error("Falha ao carregar seus leads.");
            }

            const json = await response.json();
            setPayload(json as LeadsResponse);
        } catch {
            setError("Não foi possível carregar seus leads agora.");
            setPayload(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadLeads();
    }, [loadLeads]);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage("");
        setError("");

        const normalizedState = form.state.trim().toUpperCase();
        if (normalizedState.length !== 2) {
            setError("Informe UF com 2 letras (ex: SP).");
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch("/api/leads", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...form,
                    state: normalizedState,
                }),
            });

            const json = await response.json();
            if (!response.ok || !json.success) {
                throw new Error(json.message ?? "Não foi possível criar lead.");
            }

            setForm(initialForm);
            setMessage("Solicitação criada com sucesso.");
            await loadLeads();
        } catch (submitError) {
            const submitMessage = submitError instanceof Error ? submitError.message : "Erro inesperado.";
            setError(submitMessage);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AppShell title="Cliente" className="pb-10">
            <section className="mx-auto grid w-full max-w-7xl gap-4 lg:grid-cols-[1fr_1.25fr]">
                <article className="rounded-3xl border border-[#3d2a5a] bg-[#231540]/90 p-5 shadow-xl backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a89bc2]">Área do cliente</p>
                    <h1 className="mt-2 text-2xl font-black tracking-tight">Nova solicitação jurídica</h1>
                    <p className="mt-1 text-sm text-[#a89bc2]">
                        Crie uma solicitação para receber contato de escritórios parceiros do Conecta Advogados.
                    </p>

                    <form onSubmit={handleSubmit} className="mt-4 grid gap-3">
                        <input
                            value={form.name}
                            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                            placeholder="Seu nome"
                            className="h-11 rounded-xl border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-sm outline-none placeholder:text-[#a89bc2] focus:border-[#e8472a]"
                        />
                        <input
                            value={form.email}
                            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                            placeholder="Seu email"
                            type="email"
                            className="h-11 rounded-xl border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-sm outline-none placeholder:text-[#a89bc2] focus:border-[#e8472a]"
                        />
                        <input
                            value={form.phone}
                            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                            placeholder="Seu WhatsApp"
                            className="h-11 rounded-xl border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-sm outline-none placeholder:text-[#a89bc2] focus:border-[#e8472a]"
                        />
                        <input
                            value={form.area}
                            onChange={(event) => setForm((current) => ({ ...current, area: event.target.value }))}
                            placeholder="Área jurídica (ex: Trabalhista)"
                            className="h-11 rounded-xl border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-sm outline-none placeholder:text-[#a89bc2] focus:border-[#e8472a]"
                        />
                        <input
                            value={form.state}
                            onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
                            placeholder="UF (ex: SP)"
                            maxLength={2}
                            className="h-11 rounded-xl border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-sm uppercase outline-none placeholder:text-[#a89bc2] focus:border-[#e8472a]"
                        />

                        <button
                            type="submit"
                            disabled={submitting}
                            className="mt-1 inline-flex h-11 items-center justify-center rounded-full bg-[#e8472a] px-4 text-sm font-bold text-white transition hover:bg-[#c73d22] disabled:opacity-50"
                        >
                            {submitting ? "Enviando..." : "Criar solicitação"}
                        </button>
                    </form>

                    {message && <p className="mt-3 text-sm text-emerald-300">{message}</p>}
                    {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
                </article>

                <article className="rounded-3xl border border-[#3d2a5a] bg-[#231540]/90 p-5 shadow-xl backdrop-blur">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e]/75 p-3">
                            <p className="text-xs text-[#a89bc2]">Meus leads</p>
                            <p className="mt-1 text-xl font-black">{counters.total}</p>
                        </div>
                        <div className="rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e]/75 p-3">
                            <p className="text-xs text-[#a89bc2]">Pendentes</p>
                            <p className="mt-1 text-xl font-black">{counters.pending}</p>
                        </div>
                        <div className="rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e]/75 p-3">
                            <p className="text-xs text-[#a89bc2]">Contactados</p>
                            <p className="mt-1 text-xl font-black">{counters.contacted}</p>
                        </div>
                        <div className="rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e]/75 p-3">
                            <p className="text-xs text-[#a89bc2]">Convertidos</p>
                            <p className="mt-1 text-xl font-black">{counters.converted}</p>
                        </div>
                    </div>

                    {loading && (
                        <p className="mt-4 rounded-xl border border-sky-300/20 bg-sky-300/10 px-3 py-2 text-sm text-sky-200">
                            Carregando suas solicitações...
                        </p>
                    )}

                    {!loading && leads.length === 0 && (
                        <p className="mt-4 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-[#a89bc2]">
                            Você ainda não possui solicitações. Crie a primeira no formulário ao lado.
                        </p>
                    )}

                    {!loading && leads.length > 0 && (
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full min-w-135 text-left text-sm">
                                <thead>
                                    <tr className="border-b border-white/15 text-[#a89bc2]">
                                        <th className="pb-2">Área</th>
                                        <th className="pb-2">UF</th>
                                        <th className="pb-2">Status</th>
                                        <th className="pb-2">Criado em</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leads.map((lead) => (
                                        <tr key={lead.id} className="border-b border-white/10">
                                            <td className="py-2 font-medium">{lead.area}</td>
                                            <td className="py-2">{lead.state}</td>
                                            <td className="py-2">
                                                <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusBadgeClass(lead.status)}`}>
                                                    {lead.status}
                                                </span>
                                            </td>
                                            <td className="py-2 text-[#a89bc2]">{formatDate(lead.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </article>
            </section>
        </AppShell>
    );
}
