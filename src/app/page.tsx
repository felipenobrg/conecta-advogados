import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/navigation/AppShell";
import { HeroLeadCarousel } from "../components/social-proof/HeroLeadCarousel";
import { HomeScarcityTicker } from "../components/social-proof/HomeScarcityTicker";

export default function Home() {
  return (
    <AppShell title="Inicio" fullBleed showSidebar={false} className="pb-28 md:pb-10">
      <section className="mx-auto w-full max-w-7xl px-4 pb-8 pt-4 sm:px-6">
        <div className="relative overflow-hidden rounded-4xl border border-[#3d2a5a] bg-[linear-gradient(160deg,#120021_0%,#1b0530_50%,#2d1026_100%)] p-5 shadow-[0_26px_64px_-36px_rgba(0,0,0,0.85)] sm:p-7">
          <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-[#ff4029]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-[#7b52b4]/25 blur-3xl" />

          <div className="relative animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#ff4029]/35 bg-[#ff4029]/12 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#ffb29f]">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[#ff4029]" />
              Plataforma para captação jurídica
            </p>

            <div className="mt-4 grid gap-7 lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
              <div>
                <h1 className="text-3xl font-black uppercase leading-[1.02] tracking-wide text-white sm:text-4xl lg:text-5xl">
                  Mais clientes para o seu
                  <span className="block text-[#ff4029]">escritório em menos tempo</span>
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-[#d7cde8] sm:text-base">
                  Receba contatos jurídicos com dados verificados, organize atendimento no CRM e acompanhe
                  performance sem depender de indicação ou tráfego instável.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:gap-3.5">
                  <Link
                    href="/advogados"
                    className="inline-flex h-12 items-center justify-center rounded-full bg-[#ff4029] px-5 text-sm font-black uppercase tracking-wide text-white transition hover:-translate-y-0.5 hover:bg-[#e13822]"
                  >
                    Quero captar clientes
                  </Link>
                  <Link
                    href="/leads/inscricao"
                    className="inline-flex h-12 items-center justify-center rounded-full border border-[#3d2a5a] bg-[#1d0f35] px-5 text-sm font-black uppercase tracking-wide text-[#d7cde8] transition hover:border-[#ff4029] hover:text-white"
                  >
                    Sou cliente
                  </Link>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  {[
                    { label: "Leads qualificados", value: "Alta intenção" },
                    { label: "Tempo de resposta", value: "Mais rápido" },
                    { label: "Gestão comercial", value: "CRM integrado" },
                  ].map((item) => (
                    <article key={item.label} className="rounded-2xl border border-[#3d2a5a] bg-[#170a2c]/80 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a89bc2]">{item.label}</p>
                      <p className="mt-1 text-sm font-black uppercase tracking-wide text-white">{item.value}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-md animate-fade-up delay-150">
                <div className="absolute -left-3 top-8 z-10 animate-float-slow rounded-2xl border border-[#3d2a5a] bg-[#21123d]/95 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[#d8cee9] shadow-xl">
                  Atendimento em tempo real
                </div>
                <div className="absolute -right-2 top-32 z-10 animate-float-slow rounded-2xl border border-[#ff4029]/40 bg-[#ff4029]/15 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-[#ffd8cf] shadow-xl [animation-delay:700ms]">
                  Prioridade para assinantes
                </div>

                <div className="relative overflow-hidden rounded-3xl border border-[#3d2a5a] bg-[linear-gradient(180deg,rgba(35,21,64,0.96),rgba(24,10,44,0.96))] px-3 pb-3 pt-8 shadow-[0_28px_50px_-30px_rgba(232,71,42,0.8)]">
                  <Image
                    src="/advogadoHome.png"
                    alt="Advogado representando crescimento de captação de clientes"
                    width={1080}
                    height={1320}
                    className="mx-auto h-72 w-auto object-contain sm:h-80 md:h-96"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>

          <HeroLeadCarousel />
        </div>
      </section>

      <HomeScarcityTicker />

      <section className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              title: "1. Receba oportunidades",
              text: "Leads entram com formulário qualificado e dados essenciais para triagem inicial.",
            },
            {
              title: "2. Desbloqueie e atenda",
              text: "Escolha os melhores contatos, faça abordagem por WhatsApp e registre evolução no CRM.",
            },
            {
              title: "3. Escale sua operação",
              text: "Use filtros, histórico e métricas para aumentar taxa de fechamento e previsibilidade.",
            },
          ].map((item, index) => (
            <article
              key={item.title}
              className="animate-fade-up rounded-3xl border border-[#3d2a5a] bg-[#231540]/88 p-5 shadow-xl"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#ff4029]">Método Conecta</p>
              <h2 className="mt-2 text-xl font-black uppercase tracking-wide text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#d3c6e6]">{item.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-4xl border border-[#3d2a5a] bg-[#1b0c33]/88 p-5 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.7)] backdrop-blur sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff4029]">Planos para advogados</p>
              <h3 className="mt-2 text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">
                Escolha o ritmo de crescimento do seu escritório
              </h3>
            </div>
            <Link
              href="/advogados"
              className="inline-flex h-11 items-center justify-center rounded-full bg-[#ff4029] px-5 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#e13822]"
            >
              Ver detalhes
            </Link>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              {
                plan: "Start",
                subtitle: "Para começar",
                highlight: "Até 8 desbloqueios",
                featured: false,
              },
              {
                plan: "Pro",
                subtitle: "Para acelerar",
                highlight: "Maior volume e prioridade",
                featured: false,
              },
              {
                plan: "Premium",
                subtitle: "Para escalar",
                highlight: "Ilimitado + dashboard completo",
                featured: true,
              },
            ].map((item) => (
              <article
                key={item.plan}
                className={`rounded-3xl border p-4 ${
                  item.featured
                    ? "border-[#ff4029] bg-[linear-gradient(165deg,rgba(232,71,42,0.2),rgba(35,21,64,0.95))] shadow-[0_24px_45px_-28px_rgba(232,71,42,0.9)]"
                    : "border-[#3d2a5a] bg-[#231540]/85"
                }`}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a89bc2]">{item.subtitle}</p>
                <p className="mt-2 text-2xl font-black uppercase tracking-wide text-white">{item.plan}</p>
                <p className="mt-2 text-sm text-[#d7cde8]">{item.highlight}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="fixed inset-x-3 bottom-3 z-30 md:hidden">
        <div className="rounded-2xl border border-[#3d2a5a] bg-[#160a29]/95 p-2 shadow-2xl backdrop-blur">
          <Link
            href="/advogados"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#ff4029] text-xs font-black uppercase tracking-wide text-white"
          >
            Quero captar clientes agora
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
