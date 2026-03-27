"use client";

import { useCallback, useEffect, useState } from "react";

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

function formatDate(input: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(input));
}

export default function LeadsPage() {
  const [payload, setPayload] = useState<LeadsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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
        throw new Error("Falha ao carregar leads.");
      }

      const json = await response.json();
      setPayload(json as LeadsPayload);
    } catch {
      setErrorMessage("Nao foi possivel carregar os leads no momento.");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [area, state, status, page]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <section className="mx-auto max-w-6xl space-y-4">
        <header>
          <h1 className="text-xl font-bold text-slate-900">Leads Recebidos</h1>
          <p className="text-sm text-slate-600">
            Visualize oportunidades com filtros por area, estado e status.
          </p>
        </header>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="grid gap-2 md:grid-cols-4">
            <input
              value={area}
              onChange={(event) => {
                setPage(1);
                setArea(event.target.value);
              }}
              placeholder="Area"
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
            />
            <input
              value={state}
              onChange={(event) => {
                setPage(1);
                setState(event.target.value);
              }}
              placeholder="Estado (UF)"
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
            />
            <select
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value as "" | LeadStatus);
              }}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
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
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Limpar filtros
            </button>
          </div>

          {errorMessage && (
            <p className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          )}

          {loading && (
            <p className="mt-3 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-700">
              Carregando leads...
            </p>
          )}

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-245 text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-2">Lead</th>
                  <th className="pb-2">Area</th>
                  <th className="pb-2">Estado</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Desbloqueios</th>
                  <th className="pb-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {(payload?.leads ?? []).map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-100 text-slate-700">
                    <td className="py-2">
                      <p className="font-semibold text-slate-900">{lead.name}</p>
                      <p className="text-xs text-slate-500">{lead.email}</p>
                    </td>
                    <td className="py-2">{lead.area}</td>
                    <td className="py-2">{lead.state}</td>
                    <td className="py-2">{lead.status}</td>
                    <td className="py-2">{lead.unlockCount}</td>
                    <td className="py-2">{formatDate(lead.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && (payload?.leads ?? []).length === 0 && (
            <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Nenhum lead encontrado para os filtros aplicados.
            </p>
          )}

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <p>
              Pagina {payload?.page ?? page} de {payload?.totalPages ?? 1} | Total: {payload?.total ?? 0}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={(payload?.page ?? page) <= 1}
                className="h-9 rounded-lg border border-slate-300 bg-white px-3 font-semibold text-slate-700 disabled:opacity-40"
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
                className="h-9 rounded-lg border border-slate-300 bg-white px-3 font-semibold text-slate-700 disabled:opacity-40"
              >
                Proxima
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
