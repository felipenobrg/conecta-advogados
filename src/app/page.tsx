import Image from "next/image";
import { MainHeader } from "@/components/navigation/MainHeader";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#1a0a2e] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(232,71,42,0.22),transparent_35%),radial-gradient(circle_at_88%_22%,rgba(96,58,151,0.38),transparent_40%),radial-gradient(circle_at_65%_80%,rgba(232,71,42,0.16),transparent_34%)]" />
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-30"
        viewBox="0 0 1200 900"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <path d="M-60 260C120 180 260 430 430 340C600 250 730 470 900 390C1030 330 1120 180 1280 240" stroke="#3d2a5a" strokeWidth="2" />
        <path d="M-40 520C130 470 250 620 410 580C620 530 760 700 930 650C1080 610 1140 500 1260 540" stroke="#3d2a5a" strokeWidth="2" />
        <circle cx="140" cy="208" r="5" fill="#e8472a" />
        <circle cx="322" cy="382" r="4" fill="#a89bc2" />
        <circle cx="588" cy="266" r="4" fill="#a89bc2" />
        <circle cx="802" cy="470" r="5" fill="#e8472a" />
        <circle cx="1048" cy="315" r="4" fill="#a89bc2" />
        <circle cx="298" cy="636" r="5" fill="#e8472a" />
        <circle cx="636" cy="552" r="4" fill="#a89bc2" />
        <circle cx="900" cy="664" r="5" fill="#e8472a" />
      </svg>

      <MainHeader />

      <section className="relative mx-auto grid min-h-[calc(100vh-84px)] w-full max-w-7xl gap-10 px-5 py-6 sm:px-8 md:grid-cols-2 md:items-center md:py-10">
        <article className="max-w-2xl">
          <p className="inline-flex rounded-full border border-[#3d2a5a] bg-[#231540]/85 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#a89bc2]">
            Fase Beta | Convite Limitado
          </p>

          <h1 className="mt-5 text-4xl font-black uppercase leading-[1.08] tracking-wide sm:text-5xl md:text-6xl">
            Plataforma de
            <br />
            <span className="text-[#e8472a]">contatos juridicos verificados</span>
          </h1>

          <p className="mt-5 max-w-xl text-base text-[#a89bc2] sm:text-lg">
            Conectamos clientes e advogados com triagem inicial, validação de WhatsApp e jornada mobile-first para acelerar o primeiro contato com mais previsibilidade.
          </p>

          <ul className="mt-7 space-y-2 text-lg leading-tight text-zinc-100 sm:text-2xl">
            <li>
              <span className="text-[#e8472a]">Sem</span> agencia
            </li>
            <li>
              <span className="text-[#e8472a]">Sem</span> anuncios
            </li>
            <li>
              <span className="text-[#e8472a]">Sem</span> depender de indicacao
            </li>
          </ul>

          <div className="mt-8 grid w-full gap-3 sm:w-auto sm:grid-cols-2">
            <a
              href="/onboarding?role=CLIENT"
              className="inline-flex h-14 min-w-[250px] items-center justify-center rounded-full bg-[#e8472a] px-8 text-sm font-black uppercase tracking-wide text-white shadow-[0_14px_36px_-16px_rgba(232,71,42,0.95)] transition hover:bg-[#c73d22]"
            >
              Quero um advogado
            </a>
            <a
              href="/onboarding?role=LAWYER"
              className="inline-flex h-14 min-w-[250px] items-center justify-center rounded-full border border-[#3d2a5a] bg-[#231540] px-8 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#2d1b4e]"
            >
              Sou advogado
            </a>
            <a
              href="/auth"
              className="inline-flex h-12 min-w-[250px] items-center justify-center rounded-full border border-[#3d2a5a] bg-transparent px-6 text-xs font-bold uppercase tracking-wide text-[#a89bc2] transition hover:bg-[#231540] sm:col-span-2 sm:justify-self-start"
            >
              Minha Conta
            </a>
          </div>

          <p className="mt-3 text-sm font-semibold text-[#e8472a]">*10 vagas para escritorios fundadores*</p>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Leads validados", value: "WhatsApp + triagem" },
              { label: "Tempo de resposta", value: "Fluxo em minutos" },
              { label: "Operacao", value: "Gestao em dashboard" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-[#3d2a5a] bg-[#231540]/85 p-4 shadow-xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a89bc2]">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="relative mx-auto w-full max-w-[560px]">
          <div className="absolute inset-0 -z-10 m-auto h-[74%] w-[72%] rounded-full bg-[#e8472a]/35 blur-3xl" />
          <Image
            src="/brand/hero-phone.svg"
            alt="Preview da plataforma Conecta Advogados"
            width={520}
            height={760}
            className="mx-auto h-auto w-[88%] max-w-[460px]"
            priority
          />

          <div className="absolute bottom-12 right-0 rounded-2xl border border-[#3d2a5a] bg-[#231540]/90 p-4 shadow-xl backdrop-blur sm:right-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a89bc2]">Fase Beta</p>
            <p className="mt-1 text-xl font-black tracking-wide text-[#f8fafc]">Restam apenas</p>
            <p className="text-3xl font-black text-[#e8472a]">10 vagas</p>
          </div>
        </article>
      </section>

      <section className="relative mx-auto w-full max-w-7xl px-5 pb-12 sm:px-8">
        <div className="grid gap-4 rounded-3xl border border-[#3d2a5a] bg-[#231540]/80 p-5 shadow-xl backdrop-blur sm:grid-cols-3 sm:p-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a89bc2]">1. Entrou</p>
            <p className="mt-2 text-sm text-white">Cliente ou advogado inicia o onboarding conversacional.</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a89bc2]">2. Validou</p>
            <p className="mt-2 text-sm text-white">WhatsApp verificado e perfil confirmado antes de concluir.</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a89bc2]">3. Conectou</p>
            <p className="mt-2 text-sm text-white">Jornada direciona para dashboard adequado ao papel do usuario.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
