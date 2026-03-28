"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { persistStep } from "@/lib/onboarding/persistStep";
import { completeOnboarding } from "@/lib/onboarding/completeOnboarding";
import { planCatalog } from "@/lib/payment/plans";
import {
  getTotalStepsForRole,
  type Gender,
  type PlanId,
  type UserRole,
  useOnboardingStore,
} from "@/store/useOnboardingStore";

const practiceAreaOptions = [
  "Direito Civil",
  "Trabalhista",
  "Criminal",
  "Familia",
  "Tributario",
  "Previdenciario",
  "Empresarial",
];

const oabStates = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
  "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
];

function StepMessage({ text }: { text: string }) {
  return (
    <motion.div
      key={text}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-3xl border border-[#3d2a5a] bg-[#1b0c33]/95 p-5 text-center text-sm text-white shadow-[0_12px_36px_-22px_rgba(232,71,42,0.75)]"
    >
      {text}
    </motion.div>
  );
}

type OnboardingChatProps = {
  initialRole?: UserRole;
  initialEntry?: "leads";
};

function normalizeOabNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 12);
}

function toGenderLabel(gender?: Gender) {
  if (gender === "F") return "Feminino";
  if (gender === "M") return "Masculino";
  if (gender === "O") return "Outro";
  return "-";
}

export function OnboardingChat({ initialRole, initialEntry }: OnboardingChatProps) {
  const router = useRouter();
  const {
    sessionId,
    currentStep,
    totalSteps,
    data,
    patchData,
    setRole,
    setStep,
    previousStep,
    setTotalSteps,
    setSubmitting,
    isSubmitting,
  } = useOnboardingStore();

  const [otpStatus, setOtpStatus] = useState<"idle" | "sent" | "verified">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [nextPath, setNextPath] = useState("/dashboard");

  const isLawyer = data.role === "LAWYER";
  const isClient = data.role === "CLIENT";
  const progress = (currentStep / totalSteps) * 100;

  useEffect(() => {
    if (!data.role) return;
    const expectedSteps = getTotalStepsForRole(data.role);
    if (expectedSteps !== totalSteps) {
      setTotalSteps(expectedSteps);
    }
  }, [data.role, totalSteps, setTotalSteps]);

  useEffect(() => {
    if (!initialRole) return;
    if (data.role !== initialRole) {
      setRole(initialRole);
    }
  }, [initialRole, data.role, setRole]);

  useEffect(() => {
    if (currentStep !== totalSteps) return;

    const timer = setTimeout(() => {
      router.push(nextPath);
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentStep, totalSteps, nextPath, router]);

  const stepTitle = useMemo(() => {
    if (!data.role) return "Receba ate 5 contatos";

    if (isClient) {
      const map = [
        "Receba ate 5 contatos",
        "Selecione sua opcao",
        "Dados de cadastro",
        "Area do seu caso",
        "Revisao",
        "Confirmacao",
        "Criando conta",
      ];
      return map[currentStep - 1] ?? "Criando conta";
    }

    const map = [
      initialEntry === "leads" ? "Fluxo de leads" : "Receba ate 5 contatos",
      "Selecione sua opcao",
      "Dados pessoais",
      "Dados do escritorio",
      "Dados profissionais",
      "Escolha seu plano",
      "Areas de atuacao",
      "Revisao",
      "Criando conta",
    ];

    return map[currentStep - 1] ?? "Criando conta";
  }, [currentStep, data.role, initialEntry, isClient]);

  const stepText = useMemo(() => {
    if (!data.role) {
      return "Ola! Sou o assistente da Conecta Advogados. Vamos comecar seu cadastro?";
    }

    if (isClient) {
      switch (currentStep) {
        case 1:
          return "Vamos concluir seu cadastro em poucos passos.";
        case 2:
          return "Voce esta como advogado ou cliente?";
        case 3:
          return "Preencha seus dados para ativar sua conta de cliente.";
        case 4:
          return "Selecione a area juridica principal do seu caso.";
        case 5:
          return "Revise os dados antes de confirmar.";
        case 6:
          return "Finalizando cadastro...";
        default:
          return "Criando sua conta...";
      }
    }

    switch (currentStep) {
      case 1:
        return initialEntry === "leads"
          ? "Voce iniciou pela entrada de leads. Complete seu perfil profissional para liberar seu acesso."
          : "Vamos montar seu perfil profissional para atrair contatos mais qualificados.";
      case 2:
        return "Confirme o tipo de conta para seguir no fluxo correto.";
      case 3:
        return "Informe seus dados pessoais e seu WhatsApp principal.";
      case 4:
        return "Agora informe o nome do seu escritorio e logo profissional.";
      case 5:
        return "Preencha seu numero OAB e estado OAB para validacao profissional.";
      case 6:
        return "Escolha o plano da sua conta profissional.";
      case 7:
        return "Quais areas de atuacao voce quer priorizar para receber leads?";
      case 8:
        return "Revise todas as informacoes antes de criar a conta.";
      default:
        return "Criando sua conta...";
    }
  }, [currentStep, data.role, initialEntry, isClient]);

  function canContinueCurrentStep() {
    if (currentStep === 1) return true;
    if (currentStep === 2) return Boolean(data.role);

    if (currentStep === 3) {
      return (
        Boolean(data.fullName.trim()) &&
        Boolean(data.email.trim()) &&
        Boolean(data.phone.trim()) &&
        data.password.length >= 6 &&
        Boolean(data.age) &&
        Boolean(data.gender) &&
        Boolean(data.consentAccepted)
      );
    }

    if (isClient) {
      if (currentStep === 4) return Boolean(data.clientLegalArea);
      if (currentStep === 5) return true;
      if (currentStep === 6) return true;
      return false;
    }

    if (currentStep === 4) return Boolean(data.officeName.trim());

    if (currentStep === 5) {
      return Boolean(data.oabNumber.trim()) && Boolean(data.oabState.trim()) && Boolean(data.age) && Boolean(data.gender);
    }

    if (currentStep === 6) return Boolean(data.selectedPlan);
    if (currentStep === 7) return data.practiceAreas.length > 0;
    if (currentStep === 8) return true;

    return false;
  }

  async function sendOtp() {
    if (!data.phone) {
      setStatusMessage("Informe um WhatsApp valido antes de enviar o codigo.");
      return;
    }

    const response = await fetch("/api/whatsapp/send-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone: data.phone }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setStatusMessage(body?.message ?? "Nao foi possivel enviar OTP.");
      return;
    }

    setStatusMessage("Codigo enviado para seu WhatsApp.");
    setOtpStatus("sent");
  }

  async function verifyOtp() {
    if (data.otpCode.length < 4) {
      setStatusMessage("Digite o codigo OTP recebido.");
      return;
    }

    const response = await fetch("/api/whatsapp/verify-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone: data.phone, code: data.otpCode }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setStatusMessage(body?.message ?? "OTP invalido.");
      return;
    }

    patchData({ phoneVerified: true });
    setOtpStatus("verified");
    setStatusMessage("WhatsApp verificado com sucesso.");
  }

  function togglePracticeArea(area: string) {
    const hasArea = data.practiceAreas.includes(area);
    patchData({
      practiceAreas: hasArea
        ? data.practiceAreas.filter((item) => item !== area)
        : [...data.practiceAreas, area],
    });
  }

  async function finishOnboarding() {
    const response = await completeOnboarding({
      sessionId,
      fullName: data.fullName,
      age: data.age,
      gender: data.gender,
      email: data.email,
      phone: data.phone,
      password: data.password,
      phoneVerified: data.phoneVerified,
      consentAccepted: data.consentAccepted,
      role: data.role ?? "CLIENT",
      officeName: isLawyer ? data.officeName : undefined,
      officeLogoUrl: isLawyer && data.officeLogoUrl ? data.officeLogoUrl : undefined,
      oabNumber: isLawyer ? data.oabNumber : undefined,
      oabState: isLawyer ? data.oabState : undefined,
      clientLegalArea: isClient ? data.clientLegalArea : undefined,
      selectedPlan: isLawyer ? data.selectedPlan : undefined,
      practiceAreas: isLawyer
        ? data.practiceAreas
        : data.clientLegalArea
          ? [data.clientLegalArea]
          : [],
    });

    setNextPath(response.nextPath);

    if (response.paymentPending) {
      if (!response.checkoutUrl) {
        throw new Error("Nao foi possivel iniciar o checkout Stripe.");
      }
      setStatusMessage("Conta criada! Assinatura pendente de ativacao. Redirecionando...");
      window.location.assign(response.checkoutUrl);
      return;
    }

    setStatusMessage("Conta criada! Redirecionando...");
    setStep(isLawyer ? 9 : 7);
  }

  async function saveAndContinue() {
    setStatusMessage("");
    setSubmitting(true);

    try {
      if (!canContinueCurrentStep()) {
        setStatusMessage("Preencha os campos obrigatorios para continuar.");
        return;
      }

      if (data.role) {
        document.cookie = `app_role=${data.role}; Path=/; Max-Age=2592000; SameSite=Lax`;
      }

      await persistStep({
        sessionId,
        step: currentStep,
        data: {
          ...data,
          password: "",
        },
      });

      if (currentStep === 2 && data.role) {
        setStep(3);
        return;
      }

      if (isClient) {
        if (currentStep === 3) return setStep(4);
        if (currentStep === 4) return setStep(5);
        if (currentStep === 5) return setStep(6);
        if (currentStep === 6) return finishOnboarding();
      }

      if (isLawyer) {
        if (currentStep === 3) return setStep(4);
        if (currentStep === 4) return setStep(5);
        if (currentStep === 5) return setStep(6);
        if (currentStep === 6) return setStep(7);
        if (currentStep === 7) return setStep(8);
        if (currentStep === 8) return finishOnboarding();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao salvar etapa.";
      setStatusMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  const summarySteps = isLawyer
    ? ["Boas-vindas", "Perfil", "Pessoal", "Escritorio", "OAB", "Plano", "Areas", "Confirmacao"]
    : ["Boas-vindas", "Perfil", "Dados", "Area", "Revisao", "Confirmacao"];

  return (
    <section className="mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-6xl gap-5 px-4 pb-10 pt-6 lg:grid-cols-[minmax(0,620px)_minmax(0,1fr)]">
      <div className="space-y-4 rounded-3xl border border-[#3d2a5a] bg-[#1b0c33]/88 p-4 shadow-xl backdrop-blur sm:p-5">
        <div className="rounded-3xl border border-[#3d2a5a] bg-[#231540]/90 p-4 text-center shadow-xl backdrop-blur">
          <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#e8472a]">{stepTitle}</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#a89bc2]">
            Etapa {currentStep} de {totalSteps}
          </p>
          <div className="mt-3 h-2 w-full rounded-full bg-[#2d1b4e]">
            <motion.div
              className="h-2 rounded-full bg-[#e8472a]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.35 }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-3xl border border-[#3d2a5a] bg-[#231540]/90 p-3">
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
          <StepMessage text={stepText} />
        </div>

        <div className="space-y-4 rounded-3xl border border-[#3d2a5a] bg-[#231540]/92 p-4 shadow-xl backdrop-blur">
          {currentStep === 1 && (
            <button
              type="button"
              className="h-12 w-full rounded-full bg-[#e8472a] px-4 text-sm font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#c73d22]"
              onClick={saveAndContinue}
              disabled={isSubmitting}
            >
              Vamos la
            </button>
          )}

          {currentStep === 2 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRole("LAWYER")}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide ${data.role === "LAWYER"
                  ? "border-[#e8472a] bg-[#e8472a] text-white"
                  : "border-[#3d2a5a] bg-white text-[#1a0a2e]"
                  }`}
              >
                Sou Advogado
              </button>
              <button
                type="button"
                onClick={() => setRole("CLIENT")}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide ${data.role === "CLIENT"
                  ? "border-[#e8472a] bg-[#e8472a] text-white"
                  : "border-[#3d2a5a] bg-white text-[#1a0a2e]"
                  }`}
              >
                Sou Cliente
              </button>
              <button
                type="button"
                className="ml-auto h-11 rounded-full bg-[#e8472a] px-4 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#c73d22]"
                onClick={saveAndContinue}
                disabled={!data.role || isSubmitting}
              >
                Continuar
              </button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="grid gap-3">
              <input
                placeholder="Nome completo"
                value={data.fullName}
                onChange={(event) => patchData({ fullName: event.target.value })}
                className="h-12 rounded-full border border-[#e8472a] bg-white px-4 text-sm text-[#1a0a2e] outline-none"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  placeholder="Idade"
                  type="number"
                  min={18}
                  max={120}
                  value={data.age ?? ""}
                  onChange={(event) =>
                    patchData({ age: event.target.value ? Number(event.target.value) : undefined })
                  }
                  className="h-12 rounded-full border border-[#e8472a] bg-white px-4 text-sm text-[#1a0a2e] outline-none"
                />
                <select
                  value={data.gender ?? ""}
                  onChange={(event) =>
                    patchData({
                      gender: event.target.value ? (event.target.value as Gender) : undefined,
                    })
                  }
                  className="h-12 rounded-full border border-[#e8472a] bg-white px-4 text-sm text-[#1a0a2e] outline-none"
                >
                  <option value="">Genero</option>
                  <option value="F">Feminino</option>
                  <option value="M">Masculino</option>
                  <option value="O">Outro</option>
                </select>
              </div>
              <input
                placeholder="Email"
                type="email"
                value={data.email}
                onChange={(event) => patchData({ email: event.target.value })}
                className="h-12 rounded-full border border-[#e8472a] bg-white px-4 text-sm text-[#1a0a2e] outline-none"
              />
              <input
                placeholder="Numero de WhatsApp"
                type="tel"
                value={data.phone}
                onChange={(event) => patchData({ phone: event.target.value })}
                className="h-12 rounded-full border border-[#e8472a] bg-white px-4 text-sm text-[#1a0a2e] outline-none"
              />
              <input
                placeholder="Crie uma senha (min. 6 caracteres)"
                type="password"
                value={data.password}
                onChange={(event) => patchData({ password: event.target.value })}
                className="h-12 rounded-full border border-[#e8472a] bg-white px-4 text-sm text-[#1a0a2e] outline-none"
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={sendOtp}
                  className="min-h-11 rounded-full border border-[#3d2a5a] bg-[#231540] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[#2d1b4e]"
                >
                  Enviar OTP
                </button>
                <input
                  placeholder="Codigo"
                  value={data.otpCode}
                  onChange={(event) => patchData({ otpCode: event.target.value })}
                  className="h-11 flex-1 rounded-full border border-[#e8472a] bg-white px-3 text-sm text-[#1a0a2e] outline-none"
                />
                <button
                  type="button"
                  onClick={verifyOtp}
                  className="min-h-11 rounded-full bg-[#e8472a] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[#c73d22]"
                >
                  Validar
                </button>
              </div>

              <label className="flex items-start gap-2 rounded-xl border border-[#3d2a5a]/70 bg-[#1a0a2e]/60 px-3 py-2 text-xs text-[#a89bc2]">
                <input
                  type="checkbox"
                  checked={data.consentAccepted}
                  onChange={(event) => patchData({ consentAccepted: event.target.checked })}
                  className="mt-1"
                />
                Concordo com os termos de uso e politica de privacidade (LGPD).
              </label>

              <button
                type="button"
                className="h-12 rounded-full bg-[#e8472a] px-4 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#c73d22]"
                onClick={saveAndContinue}
                disabled={!canContinueCurrentStep() || isSubmitting}
              >
                Continuar
              </button>
            </div>
          )}

          {currentStep === 4 && isLawyer && (
            <div className="grid gap-3">
              <input
                placeholder="Nome do escritorio"
                value={data.officeName}
                onChange={(event) => patchData({ officeName: event.target.value })}
                className="h-12 rounded-full border border-[#e8472a] bg-white px-4 text-sm text-[#1a0a2e] outline-none"
              />
              <input
                placeholder="URL da logo do escritorio (opcional)"
                value={data.officeLogoUrl}
                onChange={(event) => patchData({ officeLogoUrl: event.target.value })}
                className="h-12 rounded-full border border-[#e8472a] bg-white px-4 text-sm text-[#1a0a2e] outline-none"
              />
              <button
                type="button"
                className="h-12 rounded-full bg-[#e8472a] px-4 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#c73d22]"
                onClick={saveAndContinue}
                disabled={!canContinueCurrentStep() || isSubmitting}
              >
                Continuar
              </button>
            </div>
          )}

          {currentStep === 4 && isClient && (
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                {practiceAreaOptions.map((area) => {
                  const selected = data.clientLegalArea === area;
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => patchData({ clientLegalArea: area })}
                      className={`rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide ${selected
                        ? "border-[#e8472a] bg-[#e8472a] text-white"
                        : "border-[#3d2a5a] bg-white text-[#1a0a2e]"
                        }`}
                    >
                      {area}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="h-12 rounded-full bg-[#e8472a] px-4 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#c73d22]"
                onClick={saveAndContinue}
                disabled={!canContinueCurrentStep() || isSubmitting}
              >
                Continuar
              </button>
            </div>
          )}

          {currentStep === 5 && isLawyer && (
            <div className="grid gap-3">
              <input
                placeholder="Numero da OAB"
                value={data.oabNumber}
                onChange={(event) => patchData({ oabNumber: normalizeOabNumber(event.target.value) })}
                className="h-12 rounded-full border border-[#e8472a] bg-white px-4 text-sm text-[#1a0a2e] outline-none"
              />
              <select
                value={data.oabState}
                onChange={(event) => patchData({ oabState: event.target.value })}
                className="h-12 rounded-full border border-[#e8472a] bg-white px-4 text-sm text-[#1a0a2e] outline-none"
              >
                <option value="">Estado OAB</option>
                {oabStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="h-12 rounded-full bg-[#e8472a] px-4 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#c73d22]"
                onClick={saveAndContinue}
                disabled={!canContinueCurrentStep() || isSubmitting}
              >
                Continuar
              </button>
            </div>
          )}

          {currentStep === 5 && isClient && (
            <div className="grid gap-3 rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e] p-4 text-sm text-[#a89bc2]">
              <p>
                <span className="font-semibold text-white">Nome:</span> {data.fullName || "-"}
              </p>
              <p>
                <span className="font-semibold text-white">WhatsApp:</span> {data.phone || "-"}
              </p>
              <p>
                <span className="font-semibold text-white">Area:</span> {data.clientLegalArea || "-"}
              </p>
              <button
                type="button"
                className="mt-1 h-12 rounded-full bg-[#e8472a] px-4 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#c73d22]"
                onClick={saveAndContinue}
                disabled={isSubmitting}
              >
                Confirmar cadastro
              </button>
            </div>
          )}

          {currentStep === 6 && isLawyer && (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-3">
                {planCatalog.map((plan) => {
                  const selected = data.selectedPlan === plan.id;
                  const highlight = plan.id === "PREMIUM";
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => patchData({ selectedPlan: plan.id as PlanId })}
                      className={`rounded-2xl border p-3 text-left transition ${selected
                        ? "border-[#e8472a] bg-[#e8472a] text-white"
                        : highlight
                          ? "border-[#e8472a] bg-[#2d1b4e] text-white"
                          : "border-[#3d2a5a] bg-white text-[#1a0a2e]"
                        }`}
                    >
                      <p className="text-sm font-semibold">{plan.name}</p>
                      <p className="mt-1 text-xs">
                        {plan.amountInCents > 0
                          ? new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(plan.amountInCents / 100)
                          : "A definir"}
                      </p>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="h-12 rounded-full bg-[#e8472a] px-4 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#c73d22]"
                onClick={saveAndContinue}
                disabled={!canContinueCurrentStep() || isSubmitting}
              >
                Continuar
              </button>
            </div>
          )}

          {currentStep === 6 && isClient && (
            <div className="flex items-center gap-3 rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e] p-4 text-sm text-[#a89bc2]">
              <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-[#e8472a] border-r-transparent" />
              Criando conta e preparando sua area...
            </div>
          )}

          {currentStep === 7 && isLawyer && (
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                {practiceAreaOptions.map((area) => {
                  const selected = data.practiceAreas.includes(area);
                  return (
                    <button
                      key={area}
                      type="button"
                      onClick={() => togglePracticeArea(area)}
                      className={`rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide ${selected
                        ? "border-[#e8472a] bg-[#e8472a] text-white"
                        : "border-[#3d2a5a] bg-white text-[#1a0a2e]"
                        }`}
                    >
                      {area}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="h-12 rounded-full bg-[#e8472a] px-4 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#c73d22]"
                onClick={saveAndContinue}
                disabled={!canContinueCurrentStep() || isSubmitting}
              >
                Continuar
              </button>
            </div>
          )}

          {currentStep === 8 && isLawyer && (
            <div className="grid gap-3 rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e] p-4 text-sm text-[#a89bc2]">
              <p>
                <span className="font-semibold text-white">Nome:</span> {data.fullName || "-"}
              </p>
              <p>
                <span className="font-semibold text-white">Idade:</span> {data.age ?? "-"}
              </p>
              <p>
                <span className="font-semibold text-white">Genero:</span> {toGenderLabel(data.gender)}
              </p>
              <p>
                <span className="font-semibold text-white">WhatsApp:</span> {data.phone || "-"}
              </p>
              <p>
                <span className="font-semibold text-white">Escritorio:</span> {data.officeName || "-"}
              </p>
              <p>
                <span className="font-semibold text-white">OAB:</span> {data.oabNumber || "-"} / {data.oabState || "-"}
              </p>
              <p>
                <span className="font-semibold text-white">Plano:</span> {data.selectedPlan || "-"}
              </p>
              <button
                type="button"
                className="mt-1 h-12 rounded-full bg-[#e8472a] px-4 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#c73d22]"
                onClick={saveAndContinue}
                disabled={isSubmitting}
              >
                Confirmar e criar conta
              </button>
            </div>
          )}

          {currentStep === 9 && isLawyer && (
            <div className="flex items-center gap-3 rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e] p-4 text-sm text-[#a89bc2]">
              <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-[#e8472a] border-r-transparent" />
              Criando conta e preparando seu dashboard...
            </div>
          )}

          {statusMessage && <p className="text-xs text-[#a89bc2]">{statusMessage}</p>}
          {otpStatus === "verified" && <p className="text-xs font-semibold text-emerald-400">WhatsApp verificado.</p>}

          {currentStep > 1 && currentStep < totalSteps && (
            <div className="flex justify-between">
              <button
                type="button"
                onClick={previousStep}
                disabled={isSubmitting}
                className="rounded-full border border-[#3d2a5a] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#a89bc2] disabled:opacity-30"
              >
                Voltar
              </button>
            </div>
          )}
        </div>
      </div>

      <aside className="hidden rounded-3xl border border-[#3d2a5a] bg-[#231540]/86 p-5 shadow-xl backdrop-blur lg:block">
        <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a89bc2]">Resumo da jornada</h3>
        <ol className="mt-4 space-y-3">
          {summarySteps.map((label, index) => {
            const stepNumber = index + 1;
            const isDone = currentStep > stepNumber;
            const isCurrent = currentStep === stepNumber;

            return (
              <li
                key={label}
                className={`rounded-2xl border px-3 py-2 text-sm transition ${isCurrent
                  ? "border-[#e8472a] bg-[#e8472a]/15 text-white"
                  : isDone
                    ? "border-[#3d2a5a] bg-[#1a0a2e] text-[#d7cfe7]"
                    : "border-[#3d2a5a] bg-[#1a0a2e]/70 text-[#8d7fa7]"
                  }`}
              >
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-[11px] font-bold">
                  {stepNumber}
                </span>
                {label}
              </li>
            );
          })}
        </ol>

        <div className="mt-5 rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a89bc2]">Dica</p>
          <p className="mt-2 text-sm text-white">
            Perfil profissional completo aumenta a qualidade dos contatos recebidos.
          </p>
        </div>
      </aside>
    </section>
  );
}
