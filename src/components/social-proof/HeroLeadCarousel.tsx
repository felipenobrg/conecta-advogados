"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type LeadPreview = {
    id: string;
    displayName: string;
    area: string;
    state: string;
    requestedAt: string;
};

type ScarcityResponse = {
    success: boolean;
    totalRequests: number;
    items: LeadPreview[];
};

const MAX_CAROUSEL_LEADS = 10;

const fallbackLeads: LeadPreview[] = [
    {
        id: "fallback-1",
        displayName: "Felipe S.",
        area: "Direito Civil",
        state: "SP",
        requestedAt: new Date().toISOString(),
    },
    {
        id: "fallback-2",
        displayName: "Mariana J.",
        area: "Direito Trabalhista",
        state: "RJ",
        requestedAt: new Date().toISOString(),
    },
    {
        id: "fallback-3",
        displayName: "Renata A.",
        area: "Direito Previdenciario",
        state: "MG",
        requestedAt: new Date().toISOString(),
    },
    {
        id: "fallback-4",
        displayName: "Diego C.",
        area: "Direito Criminal",
        state: "DF",
        requestedAt: new Date().toISOString(),
    },
];

function getInitials(displayName: string) {
    const parts = displayName
        .split(" ")
        .map((part) => part.trim())
        .filter(Boolean);

    if (parts.length === 0) return "CL";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}

function formatTimeAgo(input: string) {
    const requestedAt = new Date(input).getTime();
    const now = Date.now();
    const diffInMinutes = Math.max(1, Math.floor((now - requestedAt) / 60000));

    if (diffInMinutes < 60) return `${diffInMinutes} min`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} h`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} d`;
}

export function HeroLeadCarousel() {
    const [leads, setLeads] = useState<LeadPreview[]>(fallbackLeads);
    const [totalRequests, setTotalRequests] = useState(0);
    const [index, setIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isAutoPlayPaused, setIsAutoPlayPaused] = useState(false);
    const pauseTimerRef = useRef<number | null>(null);

    useEffect(() => {
        let mounted = true;

        async function loadScarcity() {
            try {
                const response = await fetch("/api/public/scarcity", {
                    cache: "no-store",
                });

                if (!response.ok) {
                    return;
                }

                const payload = (await response.json()) as ScarcityResponse;
                if (!mounted) return;

                const latestLeads = payload.items.slice(0, MAX_CAROUSEL_LEADS);
                if (payload.success && latestLeads.length > 0) {
                    setLeads(latestLeads);
                    setTotalRequests(payload.totalRequests);
                    setIndex((current) => Math.min(current, latestLeads.length - 1));
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        }

        void loadScarcity();
        const refreshTimer = window.setInterval(() => {
            void loadScarcity();
        }, 25000);

        return () => {
            mounted = false;
            window.clearInterval(refreshTimer);
        };
    }, []);

    useEffect(() => {
        if (isAutoPlayPaused || leads.length <= 1) {
            return;
        }

        const timer = window.setInterval(() => {
            setIndex((previous) => (previous + 1) % leads.length);
        }, 3200);

        return () => window.clearInterval(timer);
    }, [isAutoPlayPaused, leads.length]);

    function pauseAutoPlayTemporarily() {
        setIsAutoPlayPaused(true);

        if (pauseTimerRef.current) {
            window.clearTimeout(pauseTimerRef.current);
        }

        pauseTimerRef.current = window.setTimeout(() => {
            setIsAutoPlayPaused(false);
        }, 8000);
    }

    function goToNext() {
        if (leads.length <= 1) return;
        pauseAutoPlayTemporarily();
        setIndex((previous) => (previous + 1) % leads.length);
    }

    function goToPrevious() {
        if (leads.length <= 1) return;
        pauseAutoPlayTemporarily();
        setIndex((previous) => (previous - 1 + leads.length) % leads.length);
    }

    function goTo(indexValue: number) {
        if (indexValue < 0 || indexValue >= leads.length) return;
        pauseAutoPlayTemporarily();
        setIndex(indexValue);
    }

    const lead = useMemo(() => leads[index], [leads, index]);

    if (!lead) {
        return null;
    }

    return (
        <div className="relative mt-6 overflow-hidden rounded-3xl border border-[#3d2a5a] bg-[linear-gradient(145deg,rgba(35,21,64,0.92),rgba(26,10,46,0.96))] p-4 shadow-[0_18px_40px_-28px_rgba(232,71,42,0.65)] sm:p-5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(232,71,42,0.16),transparent_44%)]" />

            <div className="relative flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#e8472a]/35 bg-[#e8472a]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#ffb29f]">
                    <span className="inline-flex h-2 w-2 rounded-full bg-[#e8472a]" />
                    Lead real ao vivo
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#a89bc2]">
                    {totalRequests > 0 ? `${totalRequests} solicitacoes` : "Atualizando"}
                </p>
            </div>

            <div className="relative mt-3 rounded-2xl border border-[#3d2a5a] bg-[#120727]/86 p-3 transition-all duration-500">
                <div className="flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#e8472a]/40 bg-[#2d1b4e] text-xs font-black text-white">
                        {getInitials(lead.displayName)}
                    </span>

                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-black uppercase tracking-wide text-white sm:text-sm">
                            {lead.displayName}, {lead.state}
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#e8472a]">Busca:</p>
                        <p className="text-[11px] font-black uppercase tracking-wide text-white sm:text-xs">{lead.area}</p>
                        <p className="mt-1 text-[11px] text-[#a89bc2]">Solicitado ha {formatTimeAgo(lead.requestedAt)}</p>
                    </div>
                </div>

                <div className="mt-3 grid gap-2 rounded-xl border border-[#3d2a5a] bg-[#1a0a2e]/70 p-2.5 sm:grid-cols-[1fr_auto] sm:items-center">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#d9cce9]">
                        Assinantes recebem estes contatos primeiro
                    </p>
                    <Link
                        href="/advogados"
                        className="inline-flex h-9 items-center justify-center rounded-full bg-[#e8472a] px-4 text-[11px] font-black uppercase tracking-wide text-white transition hover:bg-[#c73d22]"
                    >
                        Assinar agora
                    </Link>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                        {leads.map((item, dotIndex) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => goTo(dotIndex)}
                                className={`h-1.5 rounded-full transition-all ${dotIndex === index ? "w-6 bg-[#e8472a]" : "w-1.5 bg-[#5a437d]"}`}
                                aria-label={`Ir para lead ${dotIndex + 1}`}
                            />
                        ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={goToPrevious}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#3d2a5a] bg-[#231540] text-[12px] font-black text-[#d9cce9] transition hover:border-[#e8472a] hover:text-white"
                            aria-label="Lead anterior"
                        >
                            &lt;
                        </button>
                        <button
                            type="button"
                            onClick={goToNext}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#3d2a5a] bg-[#231540] text-[12px] font-black text-[#d9cce9] transition hover:border-[#e8472a] hover:text-white"
                            aria-label="Proximo lead"
                        >
                            &gt;
                        </button>
                    </div>
                </div>

                {isLoading && (
                    <div className="mt-2 text-[10px] uppercase tracking-widest text-[#a89bc2]">Sincronizando leads reais...</div>
                )}
            </div>

            <div className="relative mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl border border-[#3d2a5a] bg-[#1a0a2e]/70 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-[#a89bc2]">Lead atual</p>
                    <p className="text-xs font-bold text-white">
                        {index + 1} / {leads.length}
                    </p>
                </div>
                <div className="rounded-xl border border-[#3d2a5a] bg-[#1a0a2e]/70 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-[#a89bc2]">Prioridade</p>
                    <p className="text-xs font-bold text-[#ff9f8a]">Assinantes primeiro</p>
                </div>
            </div>
        </div>
    );
}
