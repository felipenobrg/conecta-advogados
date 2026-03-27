import Image from "next/image";
import { MainHeader } from "@/components/navigation/MainHeader";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#130022] text-white">
      <div className="pointer-events-none absolute -left-28 top-16 h-72 w-72 rounded-full bg-[#ff453a]/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-28 top-24 h-80 w-80 rounded-full bg-[#5b1fff]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-[#ff453a]/20 blur-3xl" />

      <MainHeader />

      <section className="relative mx-auto grid min-h-[calc(100vh-80px)] w-full max-w-7xl gap-10 px-5 py-6 sm:px-8 md:grid-cols-2 md:items-center md:py-10">
        <article className="max-w-xl">
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            <span className="text-[#ff453a]">Receba</span> clientes juridicos verificados
            <br />
            <span className="text-[#ff453a]">em Sao Paulo</span>
          </h1>

          <ul className="mt-9 space-y-2 text-2xl leading-tight text-zinc-100 sm:text-3xl">
            <li>
              <span className="text-[#ff453a]">Sem</span> agencia
            </li>
            <li>
              <span className="text-[#ff453a]">Sem</span> anuncios
            </li>
            <li>
              <span className="text-[#ff453a]">Sem</span> depender de indicacao
            </li>
          </ul>

          <div className="mt-9 grid w-full gap-3 sm:w-auto">
            <a
              href="/onboarding?role=CLIENT"
              className="inline-flex h-14 min-w-[260px] items-center justify-center rounded-full bg-[#ff453a] px-8 text-base font-bold text-white shadow-[0_14px_36px_-16px_rgba(255,69,58,0.95)] transition hover:brightness-110"
            >
              QUERO UM ADVOGADO
            </a>
            <a
              href="/onboarding?role=LAWYER"
              className="inline-flex h-14 min-w-[260px] items-center justify-center rounded-full border border-white/30 bg-white/10 px-8 text-base font-bold text-white transition hover:bg-white/20"
            >
              SOU UM ADVOGADO
            </a>
            <a
              href="/auth"
              className="inline-flex h-12 min-w-[260px] items-center justify-center rounded-full border border-white/30 bg-transparent px-6 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
            >
              Minha Conta
            </a>
          </div>

          <p className="mt-3 text-sm font-semibold text-[#ff453a]">*10 Vagas para Escritorios Fundadores*</p>
        </article>

        <article className="relative mx-auto w-full max-w-[560px]">
          <div className="absolute inset-0 -z-10 m-auto h-[74%] w-[72%] rounded-full bg-[#ff453a]/35 blur-3xl" />
          <Image
            src="/brand/hero-phone.svg"
            alt="Preview da plataforma Conecta Advogados"
            width={520}
            height={760}
            className="mx-auto h-auto w-[88%] max-w-[460px]"
            priority
          />

          <div className="absolute bottom-12 right-0 rounded-2xl bg-[#120024]/80 p-4 shadow-xl backdrop-blur sm:right-4">
            <p className="text-xl font-black tracking-wide text-[#f8fafc]">Restam apenas</p>
            <p className="text-3xl font-black text-[#ff453a]">10 Vagas!</p>
          </div>
        </article>
      </section>
    </main>
  );
}
