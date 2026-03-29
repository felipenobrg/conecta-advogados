"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AppShell } from "@/components/navigation/AppShell";

const practiceAreas = [
  "Direito Civil",
  "Trabalhista",
  "Criminal",
  "Familia",
  "Tributario",
  "Previdenciario",
  "Empresarial",
];

const ufList = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
  "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

const urgencyOptions = [
  { value: "LOW", label: "Baixa" },
  { value: "MEDIUM", label: "Media" },
  { value: "HIGH", label: "Alta" },
  { value: "URGENT", label: "Urgente" },
] as const;

const genderOptions = [
  { value: "F", label: "Feminino" },
  { value: "M", label: "Masculino" },
  { value: "O", label: "Outro" },
  { value: "N", label: "Prefiro nao informar" },
] as const;

const fieldClass =
  "h-12 w-full rounded-2xl border border-[#4b3770] bg-[#120727] px-4 text-base text-white outline-none transition placeholder:text-[#8d7fa7] focus:border-[#e8472a] focus:ring-2 focus:ring-[#e8472a]/30";

const primaryButtonClass =
  "h-12 rounded-full bg-[#e8472a] px-4 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#c73d22] disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButtonClass =
  "h-12 rounded-full border border-[#3d2a5a] bg-[#140a28] px-4 text-xs font-bold uppercase tracking-[0.2em] text-[#a89bc2] transition hover:bg-[#2d1b4e] disabled:cursor-not-allowed disabled:opacity-50";

const chipBaseClass =
  "rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition sm:px-4";

function getChipClass(selected: boolean) {
  return `${chipBaseClass} ${selected
    ? "border-[#e8472a] bg-[#e8472a] text-white shadow-[0_8px_24px_-16px_rgba(232,71,42,0.8)]"
    : "border-[#3d2a5a] bg-[#140a28] text-[#d7cfe7] hover:border-[#e8472a]/60 hover:text-white"
    }`;
}

function StepMessage({ text }: { text: string }) {
  return (
    <motion.div
      key={text}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-3xl border border-[#3d2a5a] bg-[#1b0c33]/95 p-4 text-sm text-white shadow-[0_12px_36px_-22px_rgba(232,71,42,0.75)]"
    >
      {text}
    </motion.div>
  );
}

type FormState = {
  name: string;
  email: string;
  phone: string;
  area: string;
  state: string;
  city: string;
  neighborhood: string;
  problemDescription: string;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | "";
  gender: "F" | "M" | "O" | "N" | "";
  consentAccepted: boolean;
};

type FieldErrors = Partial<Record<keyof FormState, string>>;

const initialFormState: FormState = {
  name: "",
  email: "",
  phone: "",
  area: "",
  state: "",
  city: "",
  neighborhood: "",
  problemDescription: "",
  urgency: "",
  gender: "",
  consentAccepted: false,
};

function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatPhone(value: string) {
  const digits = normalizePhoneDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasAtLeastTwoWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length >= 2;
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

const totalSteps = 7;

function getStepContent(step: number) {
  switch (step) {
    case 1:
      return {
        title: "Receba ate 5 contatos",
        text: "Ola! Eu sou o robozinho da Conecta. Vou te guiar para encontrar um advogado ideal para seu caso.",
      };
    case 2:
      return {
        title: "Seu caso",
        text: "Primeiro, me conte a area juridica e o nivel de urgencia para priorizar o atendimento.",
      };
    case 3:
      return {
        title: "Localizacao",
        text: "Agora preciso da sua cidade, bairro e estado para conectar com escritorios proximos.",
      };
    case 4:
      return {
        title: "Detalhes do problema",
        text: "Descreva rapidamente seu problema. Quanto mais claro, melhor a triagem do advogado.",
      };
    case 5:
      return {
        title: "Dados pessoais",
        text: "Perfeito! Agora informe seu nome completo e genero.",
      };
    case 6:
      return {
        title: "Contato",
        text: "Quase pronto. Informe seu WhatsApp e email para retorno rapido.",
      };
    case 7:
      return {
        title: "Revisao",
        text: "Confira os dados abaixo e envie sua solicitacao para conectar com os advogados.",
      };
    default:
      return {
        title: "Receba contatos",
        text: "Vamos comecar.",
      };
  }
}

export default function LeadSignupPage() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);

  const progress = Math.round((step / totalSteps) * 100);
  const stepContent = getStepContent(step);

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function validateStep(currentStep: number): FieldErrors {
    const nextErrors: FieldErrors = {};

    if (currentStep === 2) {
      if (!form.area) {
        nextErrors.area = "Selecione a area juridica do seu caso.";
      }

      if (!form.urgency) {
        nextErrors.urgency = "Selecione o nivel de urgencia do seu caso.";
      }

      return nextErrors;
    }

    if (currentStep === 3) {
      if (!form.city.trim() || form.city.trim().length < 2) {
        nextErrors.city = "Informe uma cidade valida.";
      }

      if (!form.neighborhood.trim() || form.neighborhood.trim().length < 2) {
        nextErrors.neighborhood = "Informe um bairro valido.";
      }

      if (!form.state || !ufList.includes(form.state)) {
        nextErrors.state = "Selecione uma UF valida (ex: SP).";
      }

      return nextErrors;
    }

    if (currentStep === 4) {
      const description = normalizeText(form.problemDescription);
      if (description.length < 20) {
        nextErrors.problemDescription = "Descreva seu problema com pelo menos 20 caracteres.";
      } else if (description.length > 700) {
        nextErrors.problemDescription = "Descricao muito longa. Use no maximo 700 caracteres.";
      }

      return nextErrors;
    }

    if (currentStep === 5) {
      if (!form.name.trim()) {
        nextErrors.name = "Informe seu nome completo.";
      } else if (!hasAtLeastTwoWords(form.name)) {
        nextErrors.name = "Informe nome e sobrenome.";
      }

      if (!form.gender) {
        nextErrors.gender = "Selecione uma opcao de genero.";
      }

      return nextErrors;
    }

    if (currentStep === 6) {
      const phoneDigits = normalizePhoneDigits(form.phone);
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        nextErrors.phone = "WhatsApp invalido. Use DDD + numero. Ex: (11) 98765-4321.";
      }

      if (!form.email.trim()) {
        nextErrors.email = "Informe um email para contato.";
      } else if (!isValidEmail(form.email.trim().toLowerCase())) {
        nextErrors.email = "Email invalido. Use o formato nome@dominio.com.";
      }

      if (!form.consentAccepted) {
        nextErrors.consentAccepted = "Aceite os termos LGPD para enviar sua solicitacao.";
      }

      return nextErrors;
    }

    if (currentStep === 7) {
      return validateStep(6);
    }

    return nextErrors;
  }

  function goNext() {
    setStatusMessage("");
    const nextErrors = validateStep(step);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setStatusMessage(Object.values(nextErrors)[0] ?? "Revise os dados para continuar.");
      return;
    }

    setErrors({});
    if (step < totalSteps) {
      setStep((current) => current + 1);
    }
  }

  function goBack() {
    setStatusMessage("");
    setStep((current) => (current > 1 ? current - 1 : current));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage("");
    setSuccess(false);

    const nextErrors = validateStep(7);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setStatusMessage(Object.values(nextErrors)[0] ?? "Revise os dados para continuar.");
      if (nextErrors.phone || nextErrors.email || nextErrors.consentAccepted) {
        setStep(6);
      }
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/public/leads/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: normalizeText(form.name),
          email: form.email.trim().toLowerCase(),
          phone: form.phone,
          area: form.area,
          state: form.state.toUpperCase(),
          city: normalizeText(form.city),
          neighborhood: normalizeText(form.neighborhood),
          problemDescription: normalizeText(form.problemDescription),
          urgency: form.urgency,
          gender: form.gender,
          consentAccepted: form.consentAccepted,
        }),
      });

      const json = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            code?: string;
            message?: string;
            issues?: Array<{ path?: Array<string | number>; message?: string }>;
          }
        | null;

      if (!response.ok || !json?.success) {
        const messageByCode: Record<string, string> = {
          VALIDATION_ERROR: "Revise os campos obrigatorios e tente novamente.",
          LEAD_RATE_LIMIT_IP: "Muitas tentativas neste dispositivo. Aguarde alguns minutos e tente novamente.",
          LEAD_RATE_LIMIT_EMAIL: "Muitas tentativas para este email. Aguarde alguns minutos e tente novamente.",
          LEAD_DUPLICATE_RECENT: "Ja recebemos uma solicitacao recente com esses dados. Em breve um advogado entrara em contato.",
          DATABASE_SCHEMA_MISMATCH: "Estamos finalizando uma atualizacao. Tente novamente em alguns instantes.",
          DATABASE_CLIENT_OUTDATED: "Atualizacao em andamento. Tente novamente em alguns segundos.",
          DATABASE_REQUEST_FAILED: "Nao foi possivel salvar sua solicitacao agora. Tente novamente em instantes.",
          LEAD_SUBMIT_UNEXPECTED: "Tivemos uma instabilidade momentanea. Tente novamente em instantes.",
        };

        const firstIssue = json?.issues?.[0]?.message;
        const mappedMessage = json?.code ? messageByCode[json.code] : undefined;
        throw new Error(firstIssue ?? mappedMessage ?? json?.message ?? "Nao foi possivel enviar sua inscricao.");
      }

      setSuccess(true);
      setForm(initialFormState);
      setErrors({});
      setStatusMessage("Solicitacao enviada com sucesso. Em breve um advogado entrara em contato pelo WhatsApp.");
      setStep(1);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro inesperado ao enviar inscricao.";
      setStatusMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell title="Inscricao de Lead" showSidebar={false}>
      <section className="relative mx-auto w-full max-w-6xl overflow-hidden px-4 pb-10 pt-6">
        <div className="pointer-events-none absolute -left-12 top-24 h-48 w-48 rounded-full bg-[#e8472a]/12 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-56 w-56 rounded-full bg-[#5f3aa1]/22 blur-3xl" />

        <article className="relative grid gap-4 rounded-3xl border border-[#3d2a5a] bg-[#231540]/92 p-4 shadow-xl backdrop-blur sm:p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-[#3d2a5a] bg-[#1a0a2e]/80 p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#e8472a]">{stepContent.title}</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#a89bc2]">
                Etapa {step} de {totalSteps}
              </p>
              <div className="mt-3 h-2 w-full rounded-full bg-[#2d1b4e]" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do onboarding de lead">
                <motion.div
                  className="h-2 rounded-full bg-[#e8472a]"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.35 }}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-3xl border border-[#3d2a5a] bg-[#1a0a2e]/70 p-3">
              <div className="relative h-16 w-16 shrink-0">
                <Image
                  src="/robozinhoConecta.png"
                  alt="Assistente Conecta"
                  fill
                  sizes="64px"
                  className="object-contain"
                  priority
                />
              </div>
              <StepMessage text={stepContent.text} />
            </div>

            <form onSubmit={onSubmit} className="grid gap-3 rounded-3xl border border-[#3d2a5a] bg-[#1a0a2e]/70 p-4">
              {step === 1 && (
                <div className="grid gap-3">
                  <p className="rounded-2xl border border-[#3d2a5a] bg-[#120727] p-3 text-sm text-[#d7cfe7]">
                    Este fluxo e publico e nao cria conta no sistema. Em menos de 2 minutos voce envia sua solicitacao para analise.
                  </p>
                  <button type="button" className={primaryButtonClass} onClick={goNext}>
                    Vamos comecar
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="grid gap-3">
                  <div className="flex flex-wrap gap-2">
                    {practiceAreas.map((area) => (
                      <button
                        key={area}
                        type="button"
                        className={getChipClass(form.area === area)}
                        onClick={() => setField("area", area)}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                  {errors.area && <p className="text-xs text-rose-300">{errors.area}</p>}

                  <div className="flex flex-wrap gap-2">
                    {urgencyOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={getChipClass(form.urgency === option.value)}
                        onClick={() => setField("urgency", option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {errors.urgency && <p className="text-xs text-rose-300">{errors.urgency}</p>}
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <input
                      className={`${fieldClass} ${errors.city ? "border-rose-500" : ""}`}
                      value={form.city}
                      onChange={(event) => setField("city", event.target.value)}
                      maxLength={60}
                      placeholder="Sua cidade (ex: Sao Paulo)"
                      aria-label="Cidade"
                    />
                    {errors.city && <p className="mt-1 text-xs text-rose-300">{errors.city}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <input
                      className={`${fieldClass} ${errors.neighborhood ? "border-rose-500" : ""}`}
                      value={form.neighborhood}
                      onChange={(event) => setField("neighborhood", event.target.value)}
                      maxLength={60}
                      placeholder="Seu bairro (ex: Vila Mariana)"
                      aria-label="Bairro"
                    />
                    {errors.neighborhood && <p className="mt-1 text-xs text-rose-300">{errors.neighborhood}</p>}
                  </div>

                  <div className="sm:col-span-2">
                    <select
                      className={`${fieldClass} ${errors.state ? "border-rose-500" : ""}`}
                      value={form.state}
                      onChange={(event) => setField("state", event.target.value.toUpperCase())}
                      aria-label="UF"
                    >
                      <option value="">Selecione a UF</option>
                      {ufList.map((uf) => (
                        <option key={uf} value={uf}>
                          {uf}
                        </option>
                      ))}
                    </select>
                    {errors.state && <p className="mt-1 text-xs text-rose-300">{errors.state}</p>}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="grid gap-2">
                  <textarea
                    className={`min-h-32 w-full rounded-2xl border bg-[#120727] p-4 text-sm text-white outline-none transition placeholder:text-[#8d7fa7] focus:border-[#e8472a] focus:ring-2 focus:ring-[#e8472a]/30 ${errors.problemDescription ? "border-rose-500" : "border-[#4b3770]"}`}
                    value={form.problemDescription}
                    maxLength={700}
                    onChange={(event) => setField("problemDescription", event.target.value)}
                    placeholder="Exemplo: Fui demitido sem receber verbas rescisorias e preciso entender meus direitos e prazos para entrar com a acao."
                    aria-label="Descricao do problema"
                  />
                  <div className="flex items-center justify-between text-[11px] text-[#a89bc2]">
                    <span>Descreva o contexto, prazos e o que voce precisa resolver.</span>
                    <span>{form.problemDescription.length}/700</span>
                  </div>
                  {errors.problemDescription && <p className="text-xs text-rose-300">{errors.problemDescription}</p>}
                </div>
              )}

              {step === 5 && (
                <div className="grid gap-3">
                  <input
                    className={`${fieldClass} ${errors.name ? "border-rose-500" : ""}`}
                    value={form.name}
                    onChange={(event) => setField("name", event.target.value)}
                    maxLength={120}
                    placeholder="Nome completo (ex: Maria Oliveira Santos)"
                    aria-label="Nome completo"
                  />
                  {errors.name && <p className="text-xs text-rose-300">{errors.name}</p>}

                  <div className="flex flex-wrap gap-2">
                    {genderOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={getChipClass(form.gender === option.value)}
                        onClick={() => setField("gender", option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  {errors.gender && <p className="text-xs text-rose-300">{errors.gender}</p>}
                </div>
              )}

              {step === 6 && (
                <div className="grid gap-3">
                  <input
                    className={`${fieldClass} ${errors.phone ? "border-rose-500" : ""}`}
                    value={form.phone}
                    onChange={(event) => setField("phone", formatPhone(event.target.value))}
                    inputMode="numeric"
                    placeholder="WhatsApp com DDD (ex: (11) 98765-4321)"
                    aria-label="WhatsApp"
                  />
                  {errors.phone && <p className="text-xs text-rose-300">{errors.phone}</p>}

                  <input
                    className={`${fieldClass} ${errors.email ? "border-rose-500" : ""}`}
                    type="email"
                    value={form.email}
                    onChange={(event) => setField("email", event.target.value)}
                    maxLength={120}
                    placeholder="Email para contato (ex: nome@dominio.com)"
                    aria-label="Email"
                  />
                  {errors.email && <p className="text-xs text-rose-300">{errors.email}</p>}

                  <label
                    className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
                      errors.consentAccepted
                        ? "border-rose-500 bg-rose-400/10 text-rose-200"
                        : "border-[#3d2a5a]/70 bg-[#120727]/60 text-[#a89bc2]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.consentAccepted}
                      onChange={(event) => setField("consentAccepted", event.target.checked)}
                      className="mt-1"
                    />
                    Concordo com os termos de uso e politica de privacidade (LGPD) para envio dos meus dados.
                  </label>
                  {errors.consentAccepted && <p className="text-xs text-rose-300">{errors.consentAccepted}</p>}
                </div>
              )}

              {step === 7 && (
                <div className="grid gap-3 rounded-2xl border border-[#3d2a5a] bg-[#120727]/70 p-4 text-sm text-[#d7cfe7]">
                  <p><span className="font-semibold text-white">Area:</span> {form.area || "-"}</p>
                  <p><span className="font-semibold text-white">Urgencia:</span> {urgencyOptions.find((item) => item.value === form.urgency)?.label || "-"}</p>
                  <p><span className="font-semibold text-white">Cidade:</span> {form.city || "-"}</p>
                  <p><span className="font-semibold text-white">Bairro:</span> {form.neighborhood || "-"}</p>
                  <p><span className="font-semibold text-white">UF:</span> {form.state || "-"}</p>
                  <p><span className="font-semibold text-white">Nome:</span> {form.name || "-"}</p>
                  <p><span className="font-semibold text-white">Genero:</span> {genderOptions.find((item) => item.value === form.gender)?.label || "-"}</p>
                  <p><span className="font-semibold text-white">WhatsApp:</span> {form.phone || "-"}</p>
                  <p><span className="font-semibold text-white">Email:</span> {form.email || "-"}</p>
                  <p><span className="font-semibold text-white">Problema:</span> {form.problemDescription || "-"}</p>

                  <button type="submit" className={primaryButtonClass} disabled={isSubmitting}>
                    {isSubmitting ? "Enviando solicitacao..." : "Solicitar advogados verificados"}
                  </button>
                </div>
              )}

              {step > 1 && step < 7 && (
                <div className="mt-1 flex items-center justify-between gap-2">
                  <button type="button" className={secondaryButtonClass} onClick={goBack} disabled={isSubmitting}>
                    Voltar
                  </button>
                  <button type="button" className={`${primaryButtonClass} flex-1`} onClick={goNext} disabled={isSubmitting}>
                    Avancar
                  </button>
                </div>
              )}

              {step === 7 && (
                <button type="button" className={secondaryButtonClass} onClick={goBack} disabled={isSubmitting}>
                  Voltar
                </button>
              )}
            </form>
          </div>

          <aside className="rounded-3xl border border-[#3d2a5a] bg-[#1a0a2e]/80 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a89bc2]">Como funciona</h2>
            <ol className="mt-3 space-y-2 text-sm text-[#d7cfe7]">
              <li className="rounded-2xl border border-[#3d2a5a] bg-[#120727]/70 px-3 py-2">1. Voce informa seu caso em etapas curtas.</li>
              <li className="rounded-2xl border border-[#3d2a5a] bg-[#120727]/70 px-3 py-2">2. Nossa triagem cruza area, urgencia e localizacao.</li>
              <li className="rounded-2xl border border-[#3d2a5a] bg-[#120727]/70 px-3 py-2">3. Advogados qualificados entram em contato.</li>
            </ol>

            <div className="mt-4 rounded-2xl border border-[#3d2a5a] bg-[#120727]/70 p-3 text-xs text-[#a89bc2]">
              Tempo medio de preenchimento: 2 minutos.
            </div>

            <div className="mt-5 flex flex-wrap gap-3 text-xs text-[#a89bc2]">
              <Link href="/advogados" className="font-semibold text-white hover:text-[#e8472a]">
                Sou advogado
              </Link>
              <Link href="/auth?role=LAWYER" className="font-semibold text-white hover:text-[#e8472a]">
                Ja tenho conta de advogado
              </Link>
            </div>
          </aside>

          {statusMessage && (
            <p
              className={`lg:col-span-2 rounded-xl border px-3 py-2 text-sm ${
                success ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200" : "border-[#3d2a5a] bg-[#1a0a2e]/70 text-[#ffd2c8]"
              }`}
            >
              {statusMessage}
            </p>
          )}
        </article>
      </section>
    </AppShell>
  );
}
