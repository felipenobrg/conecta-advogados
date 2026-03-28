"use client";

import { useCallback, useEffect, useState } from "react";
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

type PendingPaidPlan = "PRO" | "PREMIUM";

type PaymentRequiredPayload = {
    code?: string;
    message?: string;
    subscription?: {
        plan?: string;
        status?: string;
    } | null;
};

const statusOptions: Array<{ label: string; value: "" | LeadStatus }> = [
    { label: "Todos", value: "" },
    { label: "Pendente", value: "PENDING" },
    { label: "Contactado", value: "CONTACTED" },
    { label: "Convertido", value: "CONVERTED" },
    { label: "Perdido", value: "LOST" },
];

function formatDate(input: string) {
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(input));
}

function statusBadgeClass(status: LeadStatus) {
    if (status === "CONTACTED") return "border-sky-300/30 bg-sky-400/10 text-sky-200";
    if (status === "CONVERTED") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";
    if (status === "LOST") return "border-rose-300/30 bg-rose-400/10 text-rose-200";
    return "border-amber-300/30 bg-amber-400/10 text-amber-200";
}

function isPendingPaidPlan(input: unknown): input is PendingPaidPlan {
    return input === "PRO" || input === "PREMIUM";
}

export default function LeadsPage() {
    const [payload, setPayload] = useState<LeadsPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [pendingPaidPlan, setPendingPaidPlan] = useState<PendingPaidPlan | null>(null);
    const [isStartingCheckout, setIsStartingCheckout] = useState(false);

    const [area, setArea] = useState("");
    const [state, setState] = useState("");
    const [status, setStatus] = useState<"" | LeadStatus>("");
    const [page, setPage] = useState(1);

    const loadLeads = useCallback(async () => {
        setLoading(true);
        setErrorMessage("");

        try {
            const query = new URLSearchParams({
                page: String(page),
                pageSize: "10",
            });

            if (area.trim()) query.set("area", area.trim());
            if (state.trim()) query.set("state", state.trim());
            if (status) query.set("status", status);

            const response = await fetch(`/api/leads?${query.toString()}`, {
                cache: "no-store",
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as PaymentRequiredPayload | null;
                if (response.status === 402 && payload?.code === "PAYMENT_REQUIRED") {
                    const pendingPlan = payload.subscription?.plan;
                    setPendingPaidPlan(isPendingPaidPlan(pendingPlan) ? pendingPlan : null);
                    setErrorMessage(payload.message ?? "Finalize o pagamento para liberar os leads.");
                    setPayload(null);
                    return;
                }
                throw new Error("Falha ao carregar leads.");
            }

            const json = await response.json();
            setPendingPaidPlan(null);
            setPayload(json as LeadsPayload);
        } catch {
            setErrorMessage("Não foi possível carregar os leads no momento.");
            setPayload(null);
        } finally {
            setLoading(false);
        }
    }, [area, state, status, page]);

    useEffect(() => {
        void loadLeads();
    }, [loadLeads]);

    async function handleCheckout() {
        if (!pendingPaidPlan) return;

        setIsStartingCheckout(true);
        try {
            const response = await fetch("/api/payment/checkout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ planId: pendingPaidPlan }),
            });

            const payload = (await response.json().catch(() => ({}))) as {
                success?: boolean;
                url?: string;
                message?: string;
            };

            if (!response.ok || !payload.success || !payload.url) {
                throw new Error(payload.message ?? "Nao foi possivel iniciar checkout.");
            }

            window.location.assign(payload.url);
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Erro ao iniciar checkout.");
        } finally {
            setIsStartingCheckout(false);
        }
    }

    return (
        <AppShell title="Leads" className="pb-10">
            <section className="mx-auto max-w-6xl space-y-4">
                <header className="rounded-3xl border border-[#3d2a5a] bg-[#231540]/90 p-5 shadow-xl backdrop-blur">
                    <h1 className="text-2xl font-black tracking-tight">Leads Recebidos</h1>
                    <p className="mt-1 text-sm text-[#a89bc2]">
                        Visualize oportunidades com filtros por área, estado e status.
                    </p>
                </header>

                <section className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/90 p-4 shadow-sm backdrop-blur">
                    <div className="grid gap-2 md:grid-cols-4">
                        <input
                            value={area}
                            onChange={(event) => {
                                setPage(1);
                                setArea(event.target.value);
                            }}
                            placeholder="Área"
                            className="h-11 rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-sm text-white outline-none placeholder:text-[#a89bc2] focus:border-[#e8472a]"
                        />
                        <input
                            value={state}
                            onChange={(event) => {
                                setPage(1);
                                setState(event.target.value);
                            }}
                            placeholder="Estado (UF)"
                            className="h-11 rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-sm text-white outline-none placeholder:text-[#a89bc2] focus:border-[#e8472a]"
                        />
                        <select
                            value={status}
                            onChange={(event) => {
                                setPage(1);
                                setStatus(event.target.value as "" | LeadStatus);
                            }}
                            className="h-11 rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-sm text-white outline-none focus:border-[#e8472a]"
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
                                setStatus("");
                                setPage(1);
                            }}
                            className="h-11 rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-sm font-semibold text-[#a89bc2] transition hover:bg-[#2d1b4e]"
                        >
                            Limpar filtros
                        </button>
                    </div>

                    {errorMessage && (
                        <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
                            {errorMessage}
                        </p>
                    )}

                    {pendingPaidPlan && (
                        <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-3 text-sm text-amber-100">
                            <p>Seu plano {pendingPaidPlan} esta pendente de pagamento.</p>
                            <button
                                type="button"
                                onClick={() => void handleCheckout()}
                                disabled={isStartingCheckout}
                                className="mt-3 inline-flex h-10 items-center rounded-full bg-[#e8472a] px-4 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#c73d22] disabled:opacity-60"
                            >
                                {isStartingCheckout ? "Abrindo checkout..." : "Concluir pagamento"}
                            </button>
                        </div>
                    )}

                    {loading && (
                        <p className="mt-3 rounded-xl border border-sky-300/30 bg-sky-400/10 px-3 py-2 text-sm text-sky-200">
                            Carregando leads...
                        </p>
                    )}

                    <div className="mt-3 overflow-x-auto">
                        <table className="w-full min-w-245 text-left text-sm">
                            <thead>
                                <tr className="border-b border-white/15 text-[#a89bc2]">
                                    <th className="pb-2">Lead</th>
                                    <th className="pb-2">Área</th>
                                    <th className="pb-2">Estado</th>
                                    <th className="pb-2">Status</th>
                                    <th className="pb-2">Desbloqueios</th>
                                    <th className="pb-2">Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(payload?.leads ?? []).map((lead) => (
                                    <tr key={lead.id} className="border-b border-white/10 text-zinc-100">
                                        <td className="py-2">
                                            <p className="font-semibold text-white">{lead.name}</p>
                                            <p className="text-xs text-[#a89bc2]">{lead.email}</p>
                                        </td>
                                        <td className="py-2">{lead.area}</td>
                                        <td className="py-2">{lead.state}</td>
                                        <td className="py-2">
                                            <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusBadgeClass(lead.status)}`}>
                                                {lead.status}
                                            </span>
                                        </td>
                                        <td className="py-2">{lead.unlockCount}</td>
                                        <td className="py-2 text-[#a89bc2]">{formatDate(lead.createdAt)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {!loading && (payload?.leads ?? []).length === 0 && (
                        <p className="mt-3 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-[#a89bc2]">
                            Nenhum lead encontrado para os filtros aplicados.
                        </p>
                    )}

                    <div className="mt-4 flex items-center justify-between text-sm text-[#a89bc2]">
                        <p>
                            Página {payload?.page ?? page} de {payload?.totalPages ?? 1} | Total: {payload?.total ?? 0}
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setPage((current) => Math.max(1, current - 1))}
                                disabled={(payload?.page ?? page) <= 1}
                                className="h-9 rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-3 font-semibold text-[#a89bc2] disabled:opacity-40"
                            >
                                Anterior
                            </button>
                            <button
                                type="button"
                                onClick={() => setPage((current) => {
                                    const totalPages = payload?.totalPages ?? 1;
                                    return current >= totalPages ? current : current + 1;
                                })}
                                disabled={(payload?.page ?? page) >= (payload?.totalPages ?? 1)}
                                className="h-9 rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-3 font-semibold text-[#a89bc2] disabled:opacity-40"
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                </section>
            </section>
        </AppShell>
    );
}
