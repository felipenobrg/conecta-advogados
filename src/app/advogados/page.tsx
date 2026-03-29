import Link from "next/link";
import { LockKeyhole, Siren, TimerReset } from "lucide-react";
import { AppShell } from "@/components/navigation/AppShell";

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

async function loadBlockedLeads(): Promise<ScarcityResponse | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const endpoint = appUrl
    ? `${appUrl.replace(/\/$/, "")}/api/public/scarcity`
    : "http://localhost:3000/api/public/scarcity";

  try {
    const response = await fetch(endpoint, {
      cache: "no-store",
    });

    if (!response.ok) return null;
    return (await response.json()) as ScarcityResponse;
  } catch {
    return null;
  }
}

export default async function LawyersLandingPage() {
  const payload = await loadBlockedLeads();
  const leads = payload?.items?.slice(0, 8) ?? [];

  return (
    <AppShell title="Leads Bloqueados" showSidebar={false}>
      <section className="mx-auto w-full max-w-6xl space-y-5 py-6">
        <header className="relative overflow-hidden rounded-3xl border border-[#3d2a5a] bg-[#231540]/90 p-5 shadow-xl backdrop-blur">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#ff4029]/20 blur-3xl" />

          <p className="relative inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-[#ff4029]">
            <Siren size={14} className="animate-pulse" /> Escassez ativa
          </p>
          <h1 className="mt-2 text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">
            Leads bloqueados para advogados
          </h1>
          <p className="mt-2 text-sm text-[#cfc1e4]">
            Estes contatos estão em alta procura. Desbloqueie agora para entrar antes de outros escritórios.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e]/80 px-4 py-3 text-sm text-[#ffb29f]">
              {payload?.totalRequests
                ? `${payload.totalRequests} solicitacoes registradas recentemente.`
                : "Atualizando disponibilidade de leads bloqueados..."}
            </div>
            <div className="rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e]/80 px-4 py-3 text-sm text-[#d8cfea]">
              Janela de decisao curta: quem desbloqueia primeiro, atende primeiro.
            </div>
          </div>

          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#3d2a5a] bg-[#1a0a2e]/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#cfc1e4]">
            <TimerReset size={14} /> Atualizacao constante da fila
          </div>

        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {leads.map((lead, index) => (
            <article
              key={lead.id}
              className="animate-fade-up rounded-2xl border border-[#3d2a5a] bg-[#231540]/85 p-4 shadow-sm backdrop-blur"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#ff4029]/45 bg-[#ff4029]/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#ffd3c9]">
                <LockKeyhole size={13} /> BLOQUEADO
              </div>

              <p className="text-sm font-black uppercase tracking-wide text-white">{lead.displayName}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-[#ff9f8a]">{lead.area}</p>
              <p className="mt-1 text-xs text-[#a89bc2]">{lead.state} • ha {formatTimeAgo(lead.requestedAt)}</p>

              <div className="mt-3 rounded-xl border border-[#3d2a5a] bg-[#1a0a2e]/70 p-2.5 text-[11px] text-[#d9cce9]">
                <p className="font-semibold uppercase tracking-wide text-[#a89bc2]">Procura do usuario</p>
                <p className="mt-1 font-black uppercase tracking-wide text-white">
                  Busca advogado para {lead.area} em {lead.state}
                </p>
              </div>

              <div className="mt-3 rounded-xl border border-[#3d2a5a] bg-[#1a0a2e]/70 p-2 text-[11px] font-semibold uppercase tracking-wide text-[#d9cce9]">
                <span className="inline-flex items-center gap-1.5 text-[#ffb29f]">
                  <Siren size={12} /> Concorrencia ativa neste lead
                </span>
              </div>

              <Link
                href="/onboarding?role=LAWYER&entry=leads"
                className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-full bg-[#e8472a] px-4 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#c73d22]"
              >
                Desbloquear lead agora
              </Link>

              <p className="mt-2 text-[10px] uppercase tracking-wide text-[#a89bc2]">
                Ao desbloquear, voce recebe os dados para contato imediato.
              </p>
            </article>
          ))}
        </div>

        {leads.length === 0 && (
          <div className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/85 p-4 text-sm text-[#a89bc2]">
            Nenhum lead bloqueado no momento. Tente novamente em instantes.
          </div>
        )}
      </section>
    </AppShell>
  );
}
