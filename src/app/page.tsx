import Image from "next/image";
import { MainHeader } from "@/components/navigation/MainHeader";
import { HomeScarcityTicker } from "@/components/social-proof/HomeScarcityTicker";

export default function Home() {
  const trustMetrics = [
    { label: "Perfis validados", value: "WhatsApp e dados confirmados" },
    { label: "Roteamento inteligente", value: "Match por área e contexto" },
    { label: "Resposta ágil", value: "Fluxo de contato em minutos" },
    { label: "Gestão central", value: "Acompanhamento em dashboard" },
  ];

  const processSteps = [
    {
      title: "1. Captação qualificada",
      text: "O cliente informa o caso e passa por validações iniciais para elevar a qualidade do lead.",
    },
    {
      title: "2. Distribuição por aderência",
      text: "A demanda é direcionada para advogados com perfil compatível de área, região e disponibilidade.",
    },
    {
      title: "3. Conversão assistida",
      text: "Você recebe o contato com contexto e ganha velocidade para agendar atendimento e fechar contrato.",
    },
  ];

  const practiceAreas = [
    "Direito Civil",
    "Trabalhista",
    "Família",
    "Criminal",
    "Tributário",
    "Previdenciário",
    "Empresarial",
    "Consumidor",
  ];

  const testimonials = [
    {
      quote:
        "A qualidade dos contatos melhorou muito. Falamos com clientes que já chegam com contexto e urgência real.",
      author: "Ana Paula M.",
      role: "Advogada Cível",
    },
    {
      quote:
        "Conseguimos organizar o funil e reduzir o tempo entre primeiro contato e consulta fechada.",
      author: "Rafael S.",
      role: "Sócio de escritório",
    },
    {
      quote:
        "A experiência é direta: recebemos leads alinhados e acompanhamos tudo em um fluxo simples.",
      author: "Camila R.",
      role: "Advogada Trabalhista",
    },
  ];

  const faqs = [
    {
      question: "Como os leads são qualificados?",
      answer:
        "Cada solicitação passa por coleta estruturada de dados e validação de contato antes da distribuição.",
    },
    {
      question: "Posso escolher áreas de atuação?",
      answer:
        "Sim. No onboarding do advogado você define áreas prioritárias para receber demandas aderentes.",
    },
    {
      question: "Quando recebo novos contatos?",
      answer:
        "Assim que uma demanda compatível é validada, o encaminhamento acontece com prioridade de resposta.",
    },
    {
      question: "A plataforma atende clientes também?",
      answer:
        "Sim. Clientes podem abrir solicitações e são conectados com profissionais adequados ao caso.",
    },
  ];

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

      <section className="relative mx-auto grid min-h-[calc(100vh-84px)] w-full max-w-7xl gap-10 px-5 py-8 sm:px-8 md:grid-cols-2 md:items-center md:py-12">
        <article className="max-w-2xl">
          <p className="inline-flex rounded-full border border-[#3d2a5a] bg-[#231540]/85 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#a89bc2]">
            Plataforma Conecta Advogados
          </p>

          <h1 className="mt-5 text-4xl font-black uppercase leading-[1.08] tracking-wide sm:text-5xl md:text-6xl">
            Leads jurídicos com
            <br />
            <span className="text-[#e8472a]">foco em conversão real</span>
          </h1>

          <p className="mt-5 max-w-xl text-base text-[#a89bc2] sm:text-lg">
            O Conecta Advogados estrutura a entrada de demandas, valida contatos e entrega oportunidades com mais contexto para escritórios que querem crescer com previsibilidade.
          </p>

          <ul className="mt-7 grid gap-3 text-base leading-tight text-zinc-100 sm:text-lg">
            <li className="rounded-xl border border-[#3d2a5a] bg-[#231540]/55 px-4 py-3">
              <span className="text-[#e8472a]">Sem</span> dependência de indicações informais
            </li>
            <li className="rounded-xl border border-[#3d2a5a] bg-[#231540]/55 px-4 py-3">
              <span className="text-[#e8472a]">Sem</span> operação manual desorganizada
            </li>
            <li className="rounded-xl border border-[#3d2a5a] bg-[#231540]/55 px-4 py-3">
              <span className="text-[#e8472a]">Com</span> jornada de atendimento orientada a fechamento
            </li>
          </ul>

          <div className="mt-8 grid w-full gap-3 sm:w-auto sm:grid-cols-2">
            <a
              href="/onboarding?role=CLIENT"
              className="inline-flex h-14 min-w-[250px] items-center justify-center rounded-full bg-[#e8472a] px-8 text-sm font-black uppercase tracking-wide text-white shadow-[0_14px_36px_-16px_rgba(232,71,42,0.95)] transition hover:bg-[#c73d22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8472a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a0a2e]"
            >
              Quero um advogado
            </a>
            <a
              href="/onboarding?role=LAWYER"
              className="inline-flex h-14 min-w-[250px] items-center justify-center rounded-full border border-[#3d2a5a] bg-[#231540] px-8 text-sm font-black uppercase tracking-wide text-white transition hover:bg-[#2d1b4e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8472a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a0a2e]"
            >
              Sou um advogado
            </a>
            <a
              href="/auth"
              className="inline-flex h-12 min-w-[250px] items-center justify-center rounded-full border border-[#3d2a5a] bg-transparent px-6 text-xs font-bold uppercase tracking-wide text-[#a89bc2] transition hover:bg-[#231540] sm:col-span-2 sm:justify-self-start"
            >
              Minha Conta
            </a>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {trustMetrics.map((item) => (
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
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a89bc2]">Resultado prático</p>
            <p className="mt-1 text-xl font-black tracking-wide text-[#f8fafc]">Fluxo mais rápido</p>
            <p className="text-2xl font-black text-[#e8472a]">da triagem ao contato</p>
          </div>
        </article>
      </section>

      <HomeScarcityTicker />

      <section className="relative mx-auto w-full max-w-7xl px-5 pb-8 sm:px-8">
        <div className="rounded-3xl border border-[#3d2a5a] bg-[#231540]/80 p-5 shadow-xl backdrop-blur sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-xl font-black uppercase tracking-wide sm:text-2xl">
              Como funciona para advogados
            </h2>
            <a
              href="/onboarding?role=LAWYER"
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#e8472a] px-5 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#c73d22]"
            >
              Iniciar onboarding
            </a>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {processSteps.map((step) => (
              <div key={step.title} className="rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e]/70 p-4 shadow-[0_10px_30px_-20px_rgba(232,71,42,0.5)]">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a89bc2]">{step.title}</p>
                <p className="mt-2 text-sm text-white">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-7xl px-5 pb-8 sm:px-8">
        <div className="rounded-3xl border border-[#3d2a5a] bg-[#231540]/80 p-5 shadow-xl backdrop-blur sm:p-6">
          <h2 className="text-xl font-black uppercase tracking-wide sm:text-2xl">Áreas jurídicas atendidas</h2>
          <p className="mt-2 max-w-3xl text-sm text-[#a89bc2]">
            Atuamos com demandas em diferentes especialidades para aumentar a aderência entre caso e profissional.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {practiceAreas.map((area) => (
              <span
                key={area}
                className="rounded-full border border-[#3d2a5a] bg-[#1a0a2e]/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-7xl px-5 pb-8 sm:px-8">
        <div className="rounded-3xl border border-[#3d2a5a] bg-[#231540]/80 p-5 shadow-xl backdrop-blur sm:p-6">
          <h2 className="text-xl font-black uppercase tracking-wide sm:text-2xl">Depoimentos</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {testimonials.map((item) => (
              <article key={item.author} className="rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e]/70 p-4">
                <p className="text-sm text-white">&quot;{item.quote}&quot;</p>
                <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[#e8472a]">{item.author}</p>
                <p className="text-xs text-[#a89bc2]">{item.role}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-7xl px-5 pb-8 sm:px-8">
        <div className="rounded-3xl border border-[#3d2a5a] bg-[#231540]/80 p-5 shadow-xl backdrop-blur sm:p-6">
          <h2 className="text-xl font-black uppercase tracking-wide sm:text-2xl">FAQ</h2>
          <div className="mt-4 grid gap-3">
            {faqs.map((item) => (
              <details key={item.question} className="rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e]/70 p-4">
                <summary className="cursor-pointer list-none text-sm font-bold uppercase tracking-wide text-white">
                  {item.question}
                </summary>
                <p className="mt-2 text-sm text-[#a89bc2]">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative mx-auto w-full max-w-7xl px-5 pb-10 sm:px-8">
        <div className="rounded-3xl border border-[#3d2a5a] bg-[#231540]/80 px-5 py-6 shadow-xl backdrop-blur sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-white">Conecta Advogados</p>
              <p className="mt-1 text-xs text-[#a89bc2]">
                Plataforma para conexão entre clientes e advogados com foco em previsibilidade comercial e qualidade de atendimento.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-wide text-[#a89bc2]">
              <a href="/auth" className="transition hover:text-white">
                Minha Conta
              </a>
              <a href="#" className="transition hover:text-white">
                Política de Privacidade
              </a>
              <a href="#" className="transition hover:text-white">
                Termos de Uso
              </a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
