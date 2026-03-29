"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RefreshCcw } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";

type LeadStatus = "PENDING" | "CONTACTED" | "CONVERTED" | "LOST";
type LeadUrgency = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type AppRole = "CLIENT" | "LAWYER" | "ADMIN";
type AppPlan = "START" | "PRO" | "PREMIUM";
type ViewMode = "table" | "kanban";
type SortBy = "createdAt" | "updatedAt" | "urgency" | "status" | "area" | "state" | "city";
type SortDir = "asc" | "desc";

type LeadRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  maskedEmail: string;
  maskedPhone: string;
  area: string;
  state: string;
  city: string | null;
  neighborhood: string | null;
  urgency: LeadUrgency;
  gender: string | null;
  status: LeadStatus;
  isOwner: boolean;
  isUnlocked: boolean;
  canUnlock: boolean;
  lockReason: string | null;
  unlockCount: number;
  createdAt: string;
  updatedAt: string;
};

type LeadsPayload = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  summary: {
    pending: number;
    contacted: number;
    converted: number;
    lost: number;
  };
  access: {
    role: AppRole;
    plan: AppPlan;
    leadOfficeCap: number;
    quota: {
      unlocksUsed: number;
      unlocksLimit: number | null;
      unlocksRemaining: number | null;
      isUnlimited: boolean;
    };
  };
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
  { label: "Contatado", value: "CONTACTED" },
  { label: "Convertido", value: "CONVERTED" },
  { label: "Perdido", value: "LOST" },
];

const urgencyOptions: Array<{ label: string; value: "" | LeadUrgency }> = [
  { label: "Todas", value: "" },
  { label: "Baixa", value: "LOW" },
  { label: "Média", value: "MEDIUM" },
  { label: "Alta", value: "HIGH" },
  { label: "Urgente", value: "URGENT" },
];

const sortByOptions: Array<{ label: string; value: SortBy }> = [
  { label: "Criado em", value: "createdAt" },
  { label: "Atualizado em", value: "updatedAt" },
  { label: "Urgência", value: "urgency" },
  { label: "Status", value: "status" },
  { label: "Área", value: "area" },
  { label: "Estado", value: "state" },
  { label: "Cidade", value: "city" },
];

const statusPalette = ["#f59e0b", "#0ea5e9", "#22c55e", "#ef4444"];

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

function urgencyBadgeClass(urgency: LeadUrgency) {
  if (urgency === "URGENT") return "border-rose-300/30 bg-rose-400/10 text-rose-200";
  if (urgency === "HIGH") return "border-orange-300/30 bg-orange-400/10 text-orange-200";
  if (urgency === "LOW") return "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";
  return "border-amber-300/30 bg-amber-400/10 text-amber-200";
}

function urgencyLabel(urgency: LeadUrgency) {
  if (urgency === "URGENT") return "Urgente";
  if (urgency === "HIGH") return "Alta";
  if (urgency === "LOW") return "Baixa";
  return "Média";
}

function isPendingPaidPlan(input: unknown): input is PendingPaidPlan {
  return input === "PRO" || input === "PREMIUM";
}

function planLabel(plan: AppPlan) {
  if (plan === "PREMIUM") return "Premium";
  if (plan === "PRO") return "Pro";
  return "Start";
}

function statusLabel(status: LeadStatus) {
  if (status === "CONTACTED") return "Contatado";
  if (status === "CONVERTED") return "Convertido";
  if (status === "LOST") return "Perdido";
  return "Pendente";
}

function phoneDigits(input: string | null) {
  if (!input) return "";
  return input.replace(/\D/g, "");
}

function TableSkeleton() {
  return (
    <div className="mt-3 space-y-2">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={String(index)} className="grid animate-pulse grid-cols-8 gap-2 rounded-xl border border-white/10 bg-white/3 p-3">
          {Array.from({ length: 8 }).map((__, cellIndex) => (
            <span key={String(cellIndex)} className="h-4 rounded bg-white/10" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function LeadsPage() {
  const [payload, setPayload] = useState<LeadsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState(false);

  const [pendingPaidPlan, setPendingPaidPlan] = useState<PendingPaidPlan | null>(null);
  const [isStartingCheckout, setIsStartingCheckout] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [search, setSearch] = useState("");
  const [area, setArea] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [status, setStatus] = useState<"" | LeadStatus>("");
  const [urgency, setUrgency] = useState<"" | LeadUrgency>("");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);
  const [unlockingLeadId, setUnlockingLeadId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<Record<string, LeadStatus>>({});
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const query = new URLSearchParams({
        page: String(page),
        pageSize: "12",
        sortBy,
        sortDir,
      });

      if (search.trim()) query.set("search", search.trim());
      if (area.trim()) query.set("area", area.trim());
      if (stateFilter.trim()) query.set("state", stateFilter.trim());
      if (city.trim()) query.set("city", city.trim());
      if (neighborhood.trim()) query.set("neighborhood", neighborhood.trim());
      if (status) query.set("status", status);
      if (urgency) query.set("urgency", urgency);

      const response = await fetch(`/api/leads?${query.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const responsePayload = (await response.json().catch(() => null)) as PaymentRequiredPayload | null;
        if (response.status === 402 && responsePayload?.code === "PAYMENT_REQUIRED") {
          const pendingPlan = responsePayload.subscription?.plan;
          setPendingPaidPlan(isPendingPaidPlan(pendingPlan) ? pendingPlan : null);
          setErrorMessage(responsePayload.message ?? "Finalize o pagamento para liberar os leads.");
          setPayload(null);
          return;
        }

        throw new Error("Falha ao carregar leads.");
      }

      const json = (await response.json()) as LeadsPayload;
      setPendingPaidPlan(null);
      setPayload(json);
      setDraftStatus(
        json.leads.reduce<Record<string, LeadStatus>>((acc, lead) => {
          acc[lead.id] = lead.status;
          return acc;
        }, {})
      );
    } catch {
      setErrorMessage("Não foi possível carregar o CRM neste momento.");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortDir, search, area, stateFilter, city, neighborhood, status, urgency]);

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

      const responsePayload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        url?: string;
        message?: string;
      };

      if (!response.ok || !responsePayload.success || !responsePayload.url) {
        throw new Error(responsePayload.message ?? "Não foi possível iniciar checkout.");
      }

      window.location.assign(responsePayload.url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro ao iniciar checkout.");
    } finally {
      setIsStartingCheckout(false);
    }
  }

  async function handleUnlock(leadId: string) {
    setUnlockingLeadId(leadId);
    setActionMessage("");

    try {
      const response = await fetch("/api/leads/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leadId }),
      });

      const responsePayload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        reason?: string;
        message?: string;
      };

      if (!response.ok || !responsePayload.success) {
        throw new Error(responsePayload.reason ?? responsePayload.message ?? "Falha ao desbloquear lead.");
      }

      setActionError(false);
      setActionMessage("Lead desbloqueado com sucesso.");
      await loadLeads();
    } catch (error) {
      setActionError(true);
      setActionMessage(error instanceof Error ? error.message : "Erro ao desbloquear lead.");
    } finally {
      setUnlockingLeadId(null);
    }
  }

  async function applyLeadStatus(leadId: string, nextStatus: LeadStatus, successMessage: string) {
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

      const responsePayload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || !responsePayload.success) {
        throw new Error(responsePayload.message ?? "Falha ao atualizar status.");
      }

      setActionError(false);
      setActionMessage(successMessage);
      await loadLeads();
    } catch (error) {
      setActionError(true);
      setActionMessage(error instanceof Error ? error.message : "Erro ao atualizar status.");
    } finally {
      setSavingLeadId(null);
    }
  }

  async function handleSaveStatus(leadId: string) {
    const nextStatus = draftStatus[leadId];
    if (!nextStatus) return;

    await applyLeadStatus(leadId, nextStatus, "Status do lead atualizado com sucesso.");
  }

  async function handleExportCsv() {
    setIsExportingCsv(true);
    setActionMessage("");

    try {
      const query = new URLSearchParams();
      if (search.trim()) query.set("search", search.trim());
      if (area.trim()) query.set("area", area.trim());
      if (stateFilter.trim()) query.set("state", stateFilter.trim());
      if (city.trim()) query.set("city", city.trim());
      if (neighborhood.trim()) query.set("neighborhood", neighborhood.trim());
      if (status) query.set("status", status);
      if (urgency) query.set("urgency", urgency);

      const response = await fetch(`/api/leads/export?${query.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const responsePayload = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(responsePayload.message ?? "Não foi possível exportar o CSV.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      anchor.href = url;
      anchor.download = `leads-premium-${date}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      setActionError(false);
      setActionMessage("Exportação CSV concluída com sucesso.");
    } catch (error) {
      setActionError(true);
      setActionMessage(error instanceof Error ? error.message : "Erro ao exportar CSV.");
    } finally {
      setIsExportingCsv(false);
    }
  }

  const conversionRate = useMemo(() => {
    if (!payload || payload.total === 0) return 0;
    return (payload.summary.converted / payload.total) * 100;
  }, [payload]);

  const statusChartData = useMemo(
    () => [
      { name: "Pendentes", value: payload?.summary.pending ?? 0 },
      { name: "Contatados", value: payload?.summary.contacted ?? 0 },
      { name: "Convertidos", value: payload?.summary.converted ?? 0 },
      { name: "Perdidos", value: payload?.summary.lost ?? 0 },
    ],
    [payload]
  );

  const urgencyChartData = useMemo(() => {
    const counter: Record<LeadUrgency, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      URGENT: 0,
    };

    for (const lead of payload?.leads ?? []) {
      counter[lead.urgency] += 1;
    }

    return [
      { name: "Baixa", value: counter.LOW },
      { name: "Média", value: counter.MEDIUM },
      { name: "Alta", value: counter.HIGH },
      { name: "Urgente", value: counter.URGENT },
    ];
  }, [payload?.leads]);

  const groupedKanban = useMemo(() => {
    const result: Record<LeadStatus, LeadRow[]> = {
      PENDING: [],
      CONTACTED: [],
      CONVERTED: [],
      LOST: [],
    };

    for (const lead of payload?.leads ?? []) {
      result[lead.status].push(lead);
    }

    return result;
  }, [payload?.leads]);

  const isPremium = payload?.access.plan === "PREMIUM";
  const isLawyer = payload?.access.role === "LAWYER";
  const canExportCsv = payload?.access.role === "ADMIN" || payload?.access.plan === "PREMIUM";

  return (
    <AppShell title="CRM de Leads" className="pb-10">
      <section className="mx-auto max-w-7xl space-y-5">
        <header className="relative overflow-hidden rounded-3xl border border-[#3d2a5a] bg-linear-to-br from-[#2d1b4e] via-[#231540] to-[#1a0a2e] p-5 shadow-2xl">
          <div className="absolute -right-16 -top-12 h-44 w-44 rounded-full bg-[#e8472a]/20 blur-3xl" />
          <div className="relative flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a89bc2]">Pipeline comercial</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white md:text-3xl">
                CRM <span className="text-[#e8472a]">avançado</span> de leads
              </h1>
              <p className="mt-2 text-sm text-[#c9bde2]">
                Operação completa para qualificar, desbloquear e converter oportunidades.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="inline-flex h-10 items-center rounded-full border border-[#e8472a]/40 bg-[#e8472a]/10 px-4 text-xs font-bold uppercase tracking-wide text-[#ffd9d0]">
                Plano {planLabel(payload?.access.plan ?? "START")}
              </span>
              {canExportCsv && (
                <button
                  type="button"
                  onClick={() => void handleExportCsv()}
                  disabled={isExportingCsv}
                  className="inline-flex h-10 items-center rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-4 text-xs font-semibold uppercase tracking-wide text-[#a89bc2] transition hover:bg-[#2d1b4e] disabled:opacity-60"
                >
                  {isExportingCsv ? "Exportando..." : "Exportar CSV"}
                </button>
              )}
              <button
                type="button"
                onClick={() => void loadLeads()}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-4 text-xs font-semibold uppercase tracking-wide text-[#a89bc2] transition hover:bg-[#2d1b4e]"
              >
                <RefreshCcw size={14} /> Atualizar
              </button>
              <button
                type="button"
                onClick={() => setViewMode((current) => (current === "table" ? "kanban" : "table"))}
                className="inline-flex h-10 items-center rounded-full bg-[#e8472a] px-4 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#c73d22]"
              >
                {viewMode === "table" ? "Ver Kanban" : "Ver Tabela"}
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/90 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-[#a89bc2]">Leads visíveis</p>
            <p className="mt-2 text-3xl font-black text-white">{payload?.total ?? 0}</p>
          </article>
          <article className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/90 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-[#a89bc2]">Contatados</p>
            <p className="mt-2 text-3xl font-black text-sky-200">{payload?.summary.contacted ?? 0}</p>
          </article>
          <article className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/90 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-[#a89bc2]">Taxa de conversão</p>
            <p className="mt-2 text-3xl font-black text-emerald-200">{conversionRate.toFixed(1)}%</p>
          </article>
          <article className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/90 p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-[#a89bc2]">Desbloqueios usados</p>
            <p className="mt-2 text-3xl font-black text-white">{payload?.access.quota.unlocksUsed ?? 0}</p>
            <p className="mt-1 text-xs text-[#a89bc2]">
              {payload?.access.quota.isUnlimited
                ? "Limite ilimitado"
                : `Restam ${payload?.access.quota.unlocksRemaining ?? 0} desbloqueios`}
            </p>
          </article>
        </section>

        {isPremium && (
          <section className="grid gap-3 lg:grid-cols-2">
            <article className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/90 p-4 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#a89bc2]">Distribuição por status</h2>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusChartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                      {statusChartData.map((entry, index) => (
                        <Cell key={`${entry.name}-${entry.value}`} fill={statusPalette[index % statusPalette.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a0a2e",
                        border: "1px solid #3d2a5a",
                        borderRadius: 12,
                        color: "#fff",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </article>

            <article className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/90 p-4 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wide text-[#a89bc2]">Recorte de urgência</h2>
              <div className="mt-3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={urgencyChartData}>
                    <XAxis dataKey="name" stroke="#a89bc2" />
                    <YAxis allowDecimals={false} stroke="#a89bc2" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a0a2e",
                        border: "1px solid #3d2a5a",
                        borderRadius: 12,
                        color: "#fff",
                      }}
                    />
                    <Bar dataKey="value" fill="#e8472a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>
        )}

        <section className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/90 p-4 shadow-sm">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Buscar por nome, e-mail, telefone..."
              className="h-11 rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-sm text-white outline-none placeholder:text-[#a89bc2] focus:border-[#e8472a]"
            />
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
              value={stateFilter}
              onChange={(event) => {
                setPage(1);
                setStateFilter(event.target.value);
              }}
              placeholder="Estado (UF)"
              className="h-11 rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-sm text-white outline-none placeholder:text-[#a89bc2] focus:border-[#e8472a]"
            />
            <input
              value={city}
              onChange={(event) => {
                setPage(1);
                setCity(event.target.value);
              }}
              placeholder="Cidade"
              className="h-11 rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-sm text-white outline-none placeholder:text-[#a89bc2] focus:border-[#e8472a]"
            />
            <input
              value={neighborhood}
              onChange={(event) => {
                setPage(1);
                setNeighborhood(event.target.value);
              }}
              placeholder="Bairro"
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
            <select
              value={urgency}
              onChange={(event) => {
                setPage(1);
                setUrgency(event.target.value as "" | LeadUrgency);
              }}
              className="h-11 rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-sm text-white outline-none focus:border-[#e8472a]"
            >
              {urgencyOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as SortBy);
                setPage(1);
              }}
              className="h-11 rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-sm text-white outline-none focus:border-[#e8472a]"
            >
              {sortByOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                setSortDir((current) => (current === "desc" ? "asc" : "desc"));
                setPage(1);
              }}
              className="h-11 rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-sm font-semibold text-[#a89bc2] transition hover:bg-[#2d1b4e]"
            >
              Ordem: {sortDir === "desc" ? "Decrescente" : "Crescente"}
            </button>
          </div>

          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setArea("");
                setStateFilter("");
                setCity("");
                setNeighborhood("");
                setStatus("");
                setUrgency("");
                setSortBy("createdAt");
                setSortDir("desc");
                setPage(1);
              }}
              className="h-9 rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-xs font-semibold text-[#a89bc2] transition hover:bg-[#2d1b4e]"
            >
              Limpar todos os filtros
            </button>
          </div>

          {errorMessage && (
            <p className="mt-3 rounded-xl border border-rose-300/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
              {errorMessage}
            </p>
          )}

          {actionMessage && (
            <p
              className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
                actionError
                  ? "border-rose-300/30 bg-rose-400/10 text-rose-200"
                  : "border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
              }`}
            >
              {actionMessage}
            </p>
          )}

          {pendingPaidPlan && (
            <div className="mt-3 rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-3 text-sm text-amber-100">
              <p>Seu plano {pendingPaidPlan} está pendente de pagamento.</p>
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

          {loading && <TableSkeleton />}

          {!loading && viewMode === "table" && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-330 text-left text-sm">
                <thead>
                  <tr className="border-b border-white/15 text-[#a89bc2]">
                    <th className="pb-2">Lead</th>
                    <th className="pb-2">Localidade</th>
                    <th className="pb-2">Urgência</th>
                    <th className="pb-2">Contato</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Desbloqueios</th>
                    <th className="pb-2">Data</th>
                    <th className="pb-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(payload?.leads ?? []).map((lead) => {
                    const canManageStatus = lead.isUnlocked || payload?.access.role === "ADMIN";
                    const canShowContact = lead.isUnlocked || payload?.access.role === "ADMIN" || lead.isOwner;

                    return (
                      <tr key={lead.id} className="border-b border-white/10 align-top text-zinc-100 hover:bg-white/3">
                        <td className="py-3">
                          <p className="font-semibold text-white">{lead.name}</p>
                          <p className="text-xs text-[#a89bc2]">{lead.area}</p>
                        </td>
                        <td className="py-3">
                          <p>{lead.city ?? "-"}</p>
                          <p className="text-xs text-[#a89bc2]">{lead.neighborhood ? `${lead.neighborhood} · ` : ""}{lead.state}</p>
                        </td>
                        <td className="py-3">
                          <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${urgencyBadgeClass(lead.urgency)}`}>
                            {urgencyLabel(lead.urgency)}
                          </span>
                        </td>
                        <td className="py-3">
                          {canShowContact ? (
                            <>
                              <p className="text-sm text-white">{lead.email ?? "-"}</p>
                              <p className="text-xs text-[#a89bc2]">{lead.phone ?? "-"}</p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-[#a89bc2]">{lead.maskedEmail}</p>
                              <p className="text-xs text-[#a89bc2]">{lead.maskedPhone}</p>
                            </>
                          )}
                        </td>
                        <td className="py-3">
                          {canManageStatus ? (
                            <select
                              value={draftStatus[lead.id] ?? lead.status}
                              onChange={(event) =>
                                setDraftStatus((current) => ({
                                  ...current,
                                  [lead.id]: event.target.value as LeadStatus,
                                }))
                              }
                              className="h-9 rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-xs font-semibold text-white outline-none focus:border-[#e8472a]"
                            >
                              {statusOptions
                                .filter((option) => option.value)
                                .map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusBadgeClass(lead.status)}`}>
                              {statusLabel(lead.status)}
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <p>{lead.unlockCount}</p>
                          <p className="text-xs text-[#a89bc2]">cap {payload?.access.leadOfficeCap ?? 0}</p>
                        </td>
                        <td className="py-3 text-[#a89bc2]">{formatDate(lead.createdAt)}</td>
                        <td className="py-3">
                          <div className="flex max-w-60 flex-col gap-2">
                            {isLawyer && !lead.isUnlocked && (
                              <button
                                type="button"
                                onClick={() => void handleUnlock(lead.id)}
                                disabled={!lead.canUnlock || unlockingLeadId === lead.id}
                                className="h-9 rounded-full bg-[#e8472a] px-3 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#c73d22] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {unlockingLeadId === lead.id ? "Desbloqueando..." : "Desbloquear"}
                              </button>
                            )}

                            {canManageStatus && (
                              <button
                                type="button"
                                onClick={() => void handleSaveStatus(lead.id)}
                                disabled={savingLeadId === lead.id}
                                className="h-9 rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-xs font-semibold text-[#a89bc2] transition hover:bg-[#2d1b4e] disabled:opacity-60"
                              >
                                {savingLeadId === lead.id ? "Salvando..." : "Salvar status"}
                              </button>
                            )}

                            {canShowContact && (
                              <div className="flex gap-2">
                                {lead.phone && (
                                  <a
                                    href={`https://wa.me/55${phoneDigits(lead.phone)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex h-8 items-center rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-[11px] font-semibold text-[#a89bc2] transition hover:bg-[#2d1b4e]"
                                  >
                                    WhatsApp
                                  </a>
                                )}
                                {lead.email && (
                                  <a
                                    href={`mailto:${lead.email}`}
                                    className="inline-flex h-8 items-center rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-[11px] font-semibold text-[#a89bc2] transition hover:bg-[#2d1b4e]"
                                  >
                                    E-mail
                                  </a>
                                )}
                              </div>
                            )}

                            {!lead.isUnlocked && lead.lockReason && (
                              <p className="text-[11px] text-amber-200">{lead.lockReason}</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && viewMode === "kanban" && (
            <div className="mt-3 grid gap-3 lg:grid-cols-4">
              {(["PENDING", "CONTACTED", "CONVERTED", "LOST"] as const).map((columnStatus) => (
                <section
                  key={columnStatus}
                  className={`rounded-2xl border bg-[#1a0a2e]/80 p-3 transition ${
                    dragOverStatus === columnStatus ? "border-[#e8472a]" : "border-[#3d2a5a]"
                  }`}
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (dragOverStatus !== columnStatus) {
                      setDragOverStatus(columnStatus);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverStatus === columnStatus) {
                      setDragOverStatus(null);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    const droppedLeadId = event.dataTransfer.getData("text/plain") || draggingLeadId;
                    setDragOverStatus(null);
                    setDraggingLeadId(null);

                    if (!droppedLeadId || !payload) {
                      return;
                    }

                    const droppedLead = payload.leads.find((lead) => lead.id === droppedLeadId);
                    if (!droppedLead) {
                      return;
                    }

                    const canManageStatus = droppedLead.isUnlocked || payload.access.role === "ADMIN";
                    if (!canManageStatus || droppedLead.status === columnStatus) {
                      return;
                    }

                    setDraftStatus((current) => ({
                      ...current,
                      [droppedLead.id]: columnStatus,
                    }));

                    void applyLeadStatus(
                      droppedLead.id,
                      columnStatus,
                      "Lead movido no Kanban e status atualizado."
                    );
                  }}
                >
                  <header className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-[#a89bc2]">{statusLabel(columnStatus)}</h3>
                    <span className="rounded-full border border-[#3d2a5a] px-2 py-1 text-[10px] text-[#a89bc2]">
                      {groupedKanban[columnStatus].length}
                    </span>
                  </header>

                  <div className="space-y-2">
                    {groupedKanban[columnStatus].map((lead) => {
                      const canManageStatus = lead.isUnlocked || payload?.access.role === "ADMIN";
                      const canShowContact = lead.isUnlocked || payload?.access.role === "ADMIN" || lead.isOwner;

                      return (
                        <article
                          key={lead.id}
                          className="rounded-xl border border-[#3d2a5a] bg-[#231540]/85 p-3"
                          draggable={canManageStatus}
                          onDragStart={(event) => {
                            if (!canManageStatus) {
                              return;
                            }
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData("text/plain", lead.id);
                            setDraggingLeadId(lead.id);
                          }}
                          onDragEnd={() => {
                            setDraggingLeadId(null);
                            setDragOverStatus(null);
                          }}
                        >
                          <p className="text-sm font-semibold text-white">{lead.name}</p>
                          <p className="mt-1 text-xs text-[#a89bc2]">{lead.area}</p>
                          <p className="text-xs text-[#a89bc2]">{lead.city ?? "-"} · {lead.state}</p>

                          <div className="mt-2 flex items-center gap-2">
                            <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${urgencyBadgeClass(lead.urgency)}`}>
                              {urgencyLabel(lead.urgency)}
                            </span>
                            <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${statusBadgeClass(lead.status)}`}>
                              {statusLabel(lead.status)}
                            </span>
                          </div>

                          <div className="mt-2 text-[11px] text-[#c9bde2]">
                            <p>{canShowContact ? lead.email ?? "-" : lead.maskedEmail}</p>
                            <p>{canShowContact ? lead.phone ?? "-" : lead.maskedPhone}</p>
                          </div>

                          <div className="mt-2 space-y-2">
                            {isLawyer && !lead.isUnlocked && (
                              <button
                                type="button"
                                onClick={() => void handleUnlock(lead.id)}
                                disabled={!lead.canUnlock || unlockingLeadId === lead.id}
                                className="h-8 w-full rounded-full bg-[#e8472a] px-3 text-[11px] font-bold uppercase tracking-wide text-white transition hover:bg-[#c73d22] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {unlockingLeadId === lead.id ? "Desbloqueando..." : "Desbloquear"}
                              </button>
                            )}

                            {canManageStatus && (
                              <div className="flex gap-2">
                                <select
                                  value={draftStatus[lead.id] ?? lead.status}
                                  onChange={(event) =>
                                    setDraftStatus((current) => ({
                                      ...current,
                                      [lead.id]: event.target.value as LeadStatus,
                                    }))
                                  }
                                  className="h-8 flex-1 rounded-full border border-[#3d2a5a] bg-[#120727] px-2 text-[11px] text-white outline-none"
                                >
                                  {statusOptions
                                    .filter((option) => option.value)
                                    .map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() => void handleSaveStatus(lead.id)}
                                  disabled={savingLeadId === lead.id}
                                  className="h-8 rounded-full border border-[#3d2a5a] bg-[#120727] px-3 text-[11px] font-semibold text-[#a89bc2] transition hover:bg-[#2d1b4e] disabled:opacity-60"
                                >
                                  Salvar
                                </button>
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}

                    {groupedKanban[columnStatus].length === 0 && (
                      <div className="rounded-xl border border-dashed border-[#3d2a5a] bg-[#120727]/70 p-3 text-center text-xs text-[#a89bc2]">
                        Nenhum lead nesta coluna.
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          )}

          {!loading && (payload?.leads ?? []).length === 0 && (
            <div className="mt-3 rounded-xl border border-white/15 bg-white/5 px-4 py-5 text-center">
              <p className="text-sm font-semibold text-white">Nenhum lead encontrado com os filtros atuais.</p>
              <p className="mt-1 text-xs text-[#a89bc2]">Ajuste os filtros ou limpe a busca para ampliar os resultados.</p>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 text-sm text-[#a89bc2] md:flex-row md:items-center md:justify-between">
            <p>
              Página {payload?.page ?? page} de {payload?.totalPages ?? 1} · Total: {payload?.total ?? 0}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!payload?.hasPreviousPage}
                className="h-9 rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-3 font-semibold text-[#a89bc2] disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => setPage((current) => current + 1)}
                disabled={!payload?.hasNextPage}
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
