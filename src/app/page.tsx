import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/navigation/AppShell";
import { HeroLeadCarousel } from "../components/social-proof/HeroLeadCarousel";

export default function Home() {
  return (
    <AppShell title="Inicio" fullBleed>
      <section className="mx-auto w-full max-w-7xl pb-10 pt-4">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="relative overflow-hidden rounded-4xl border border-[#3d2a5a] bg-[linear-gradient(180deg,#130021_0%,#1b0530_58%,#2c0c23_100%)] p-5 shadow-[0_26px_64px_-36px_rgba(0,0,0,0.8)] sm:p-6">
            <svg
              className="pointer-events-none absolute left-0 top-5 h-28 w-full opacity-70"
              viewBox="0 0 680 130"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden
            >
              <path d="M10 84L120 26L232 94L354 16L470 74L680 74" stroke="#ff4029" strokeWidth="4" />
              <circle cx="120" cy="26" r="7" fill="#ff4029" />
              <circle cx="232" cy="94" r="7" fill="#ff4029" />
              <circle cx="354" cy="16" r="7" fill="#ff4029" />
              <circle cx="470" cy="74" r="7" fill="#ff4029" />
            </svg>

            <div className="relative mt-10 grid gap-6 md:grid-cols-[0.92fr_1.08fr] md:items-center">
              <div className="flex justify-center md:justify-start">
                <Image
                  src="/advogadoHome.png"
                  alt="Advogado Conecta"
                  width={1080}
                  height={1320}
                  className="h-72 w-auto object-contain sm:h-80 md:h-96"
                  priority
                />
              </div>

              <div>
                <h1 className="text-3xl font-black uppercase leading-[1.02] tracking-wide text-white sm:text-4xl">
                  Conecta
                  <span className="block text-[#ff4029]">Advogados</span>
                </h1>
                <p className="mt-3 max-w-lg text-[15px] leading-6 text-[#d7cde8]">
                  Conecte clientes e advogados com contatos juridicos verificados em um fluxo simples.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/leads/inscricao"
                    className="inline-flex h-12 items-center justify-center rounded-full bg-[#ff4029] text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#e13822]"
                  >
                    Quero um advogado
                  </Link>
                  <Link
                    href="/advogados"
                    className="inline-flex h-12 items-center justify-center rounded-full bg-[#ff4029] text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#e13822]"
                  >
                    Sou advogado
                  </Link>
                </div>

                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-[#e0d8ee]">
                  Validacao rapida e atendimento com prioridade
                </p>
              </div>
            </div>

            <HeroLeadCarousel />
          </article>

          <article className="rounded-4xl border border-[#3d2a5a] bg-[#1b0c33]/88 p-4 shadow-[0_20px_40px_-24px_rgba(0,0,0,0.7)] backdrop-blur sm:p-5">
            <div className="rounded-3xl border border-[#3d2a5a] bg-[#231540]/90 p-4">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ff4029]">Conecta Advogados</p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">
                Plataforma juridica com foco em conversao
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#cfc1e4]">
                Entrada objetiva para captar, qualificar e distribuir oportunidades entre cliente e advogado.
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#a89bc2]">Assinatura</p>
                <p className="mt-2 text-sm font-semibold text-white">Prioridade em novos contatos</p>
                <p className="mt-1 text-xs text-[#cfc1e4]">Seu escritorio recebe as melhores oportunidades antes.</p>
              </div>
              <div className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#a89bc2]">Conversao</p>
                <p className="mt-2 text-sm font-semibold text-white">Entrada em 1 clique</p>
                <p className="mt-1 text-xs text-[#cfc1e4]">Cliente e advogado entram no caminho certo.</p>
              </div>
              <div className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#a89bc2]">Beneficios</p>
                <p className="mt-2 text-sm font-semibold text-white">Mais casos, menos tempo perdido</p>
                <p className="mt-1 text-xs text-[#cfc1e4]">Triagem inteligente para aumentar sua chance de fechamento.</p>
              </div>
              <div className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#a89bc2]">Performance</p>
                <p className="mt-2 text-sm font-semibold text-white">Leads qualificados para advogados</p>
                <p className="mt-1 text-xs text-[#cfc1e4]">Contatos verificados para acelerar atendimento e resultado.</p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </AppShell>
  );
}
