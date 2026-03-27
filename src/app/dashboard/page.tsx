"use client";

import { TrendingUp } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const historyRows = [
  { lead: "Maria Souza", area: "Trabalhista", status: "CONTACTED", date: "26/03/2026" },
  { lead: "Carlos Nunes", area: "Civil", status: "PENDING", date: "25/03/2026" },
  { lead: "Joana Silva", area: "Familia", status: "CONVERTED", date: "24/03/2026" },
];

const monthlyPerformance = [
  { month: "Jan", leads: 16 },
  { month: "Fev", leads: 21 },
  { month: "Mar", leads: 28 },
  { month: "Abr", leads: 25 },
  { month: "Mai", leads: 30 },
  { month: "Jun", leads: 36 },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6">
      <section className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-slate-900">Dashboard Primum</h1>
          <div className="flex gap-2">
            <input type="date" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
            <input type="date" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Total de leads recebidos</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">124</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-600">
              <TrendingUp size={14} /> +12% no mes
            </p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Leads desbloqueados</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">88</p>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Taxa de conversao</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-14 w-14 rounded-full border-4 border-orange-500 border-l-slate-200" />
              <p className="text-lg font-bold text-slate-900">34%</p>
            </div>
          </article>
          <article className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">Atendente</p>
            <select className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <option>Todas</option>
              <option>Equipe A</option>
              <option>Equipe B</option>
            </select>
          </article>
        </div>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Desempenho mensal</h2>
          <div className="mt-3 h-64 w-full">
            <ResponsiveContainer>
              <LineChart data={monthlyPerformance}>
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip />
                <Line type="monotone" dataKey="leads" stroke="#4338ca" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Historico de contatos</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead>
                <tr className="text-slate-500">
                  <th className="pb-2">Lead</th>
                  <th className="pb-2">Area</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((row) => (
                  <tr key={row.lead} className="border-t border-slate-100 text-slate-700">
                    <td className="py-2">{row.lead}</td>
                    <td className="py-2">{row.area}</td>
                    <td className="py-2">{row.status}</td>
                    <td className="py-2">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
