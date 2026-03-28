import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/navigation/AppShell";

export default function Home() {
  return (
    <AppShell title="Inicio" fullBleed>
      <section className="mx-auto w-full max-w-7xl pb-10 pt-4">
        <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="relative overflow-hidden rounded-4xl border border-[#3d2a5a] bg-[linear-gradient(180deg,#130021_0%,#1b0530_58%,#3b0e1f_100%)] p-5 shadow-[0_34px_80px_-32px_rgba(0,0,0,0.9)] sm:p-6">
            <svg
              className="pointer-events-none absolute left-0 top-5 h-28 w-full opacity-90"
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
                  Conecte-se com
                  <span className="block text-[#ff4029]">advogados</span>
                </h1>
                <p className="mt-3 max-w-lg text-[15px] leading-6 text-[#d7cde8]">
                  Receba contato de advogados do estado de Sao Paulo verificados.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/onboarding?role=CLIENT"
                    className="inline-flex h-12 items-center justify-center rounded-full bg-[#ff4029] text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#e13822]"
                  >
                    Quero um advogado
                  </Link>
                  <Link
                    href="/onboarding?role=LAWYER&entry=leads"
                    className="inline-flex h-12 items-center justify-center rounded-full bg-[#ff4029] text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#e13822]"
                  >
                    Sou um advogado
                  </Link>
                </div>

                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-[#e0d8ee]">
                  + de 1.650 pessoas solicitando orcamento conosco
                </p>
              </div>
            </div>

            <div className="relative mt-6 grid grid-cols-[1fr_auto] gap-3">
              <div className="rounded-xl border border-[#624283] bg-[#f4f0fb] p-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#d9d1ea] text-[11px] font-bold text-[#1a0a2e]">
                    FS
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#1a0a2e]">Felipe Silva, 32 anos</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#ff4029]">Procuro:</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#1a0a2e]">Advogado Civil</p>
                  </div>
                </div>
              </div>
              <div className="grid h-full w-18.5 place-items-center rounded-xl border border-[#624283] bg-[#f4f0fb]">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#d9d1ea] text-[11px] font-bold text-[#1a0a2e]">
                  CR
                </span>
              </div>
            </div>
          </article>

          <article className="rounded-4xl border border-[#3d2a5a] bg-[#1b0c33]/88 p-4 shadow-xl backdrop-blur sm:p-5">
            <div className="rounded-3xl border border-[#3d2a5a] bg-[#231540]/90 p-4">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ff4029]">Estilo web app</p>
              <h2 className="mt-2 text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">
                Experiencia premium no desktop e mobile
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#cfc1e4]">
                Home com composicao forte, menu lateral no desktop, elementos de confianca e CTA de alto contraste para melhorar conversao.
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#a89bc2]">Design</p>
                <p className="mt-2 text-sm font-semibold text-white">Dark premium com gradiente</p>
                <p className="mt-1 text-xs text-[#cfc1e4]">Paleta roxo + laranja com profundidade e contraste.</p>
              </div>
              <div className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#a89bc2]">Conversao</p>
                <p className="mt-2 text-sm font-semibold text-white">CTA claro e direto</p>
                <p className="mt-1 text-xs text-[#cfc1e4]">Fluxo em dois caminhos: cliente ou advogado.</p>
              </div>
              <div className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#a89bc2]">Navegacao</p>
                <p className="mt-2 text-sm font-semibold text-white">Layout de aplicativo</p>
                <p className="mt-1 text-xs text-[#cfc1e4]">Sidebar no desktop e barra inferior no mobile.</p>
              </div>
              <div className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/80 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#a89bc2]">Performance</p>
                <p className="mt-2 text-sm font-semibold text-white">Conteudo acima da dobra</p>
                <p className="mt-1 text-xs text-[#cfc1e4]">Informacoes principais visiveis de imediato no notebook.</p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </AppShell>
  );
}
