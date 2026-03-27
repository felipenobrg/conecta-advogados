"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { persistStep } from "@/lib/onboarding/persistStep";
import { completeOnboarding } from "@/lib/onboarding/completeOnboarding";
import { planCatalog } from "@/lib/payment/plans";
import { type PlanId, useOnboardingStore } from "@/store/useOnboardingStore";

const practiceAreaOptions = [
  "Direito Civil",
  "Trabalhista",
  "Criminal",
  "Familia",
  "Tributario",
  "Previdenciario",
  "Empresarial",
];

function StepMessage({ text }: { text: string }) {
  return (
    <motion.div
      key={text}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-3xl rounded-tl-md bg-white p-4 text-sm text-slate-700 shadow-sm"
    >
      {text}
    </motion.div>
  );
}

type OnboardingChatProps = {
  initialRole?: "LAWYER" | "CLIENT";
};

export function OnboardingChat({ initialRole }: OnboardingChatProps) {
  const router = useRouter();
  const {
    sessionId,
    currentStep,
    totalSteps,
    data,
    patchData,
    nextStep,
    previousStep,
    setSubmitting,
    isSubmitting,
  } = useOnboardingStore();

  const [otpStatus, setOtpStatus] = useState<"idle" | "sent" | "verified">("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");

  const progress = (currentStep / totalSteps) * 100;

  const stepText = useMemo(() => {
    switch (currentStep) {
      case 1:
        return "Ola! Sou o assistente do Conecta Advogados. Vou te ajudar a configurar sua conta em poucos passos. Vamos comecar?";
      case 2:
        return "Voce e um advogado buscando clientes ou um cliente buscando um advogado?";
      case 3:
        return "Perfeito! Agora preencha seus dados basicos para comecarmos.";
      case 4:
        return "Escolha seu plano para ativar sua conta profissional.";
      case 5:
        return "Quais areas de atuacao deseja receber leads?";
      case 6:
      default:
        return "Tudo certo! Criando sua conta...";
    }
  }, [currentStep]);

  const isLawyer = data.role === "LAWYER";

  useEffect(() => {
    if (!initialRole) {
      return;
    }

    if (data.role !== initialRole) {
      patchData({ role: initialRole });
    }
  }, [initialRole, data.role, patchData]);

  useEffect(() => {
    if (currentStep !== 6) return;

    const timer = setTimeout(() => {
      router.push(data.role === "LAWYER" ? "/dashboard" : "/");
    }, 1600);

    return () => clearTimeout(timer);
  }, [currentStep, data.role, router]);

  async function saveAndContinue() {
    setStatusMessage("");
    setSubmitting(true);
    try {
      if (data.role) {
        document.cookie = `app_role=${data.role}; Path=/; Max-Age=2592000; SameSite=Lax`;
      }

      await persistStep({
        sessionId,
        step: currentStep,
        data,
      });

      if (currentStep === 3 && data.role === "CLIENT") {
        await completeOnboarding({
          sessionId,
          fullName: data.fullName,
          email: data.email,
          phone: data.phone,
          phoneVerified: data.phoneVerified,
          consentAccepted: data.consentAccepted,
          role: "CLIENT",
          practiceAreas: [],
        });

        setStatusMessage("Conta criada! Redirecionando...");
        useOnboardingStore.getState().setStep(6);
        return;
      }

      if (currentStep === 5) {
        if (data.role === "LAWYER") {
          await completeOnboarding({
            sessionId,
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            phoneVerified: data.phoneVerified,
            consentAccepted: data.consentAccepted,
            role: "LAWYER",
            selectedPlan: data.selectedPlan,
            practiceAreas: data.practiceAreas,
          });
        }

        setStatusMessage("Conta criada! Redirecionando...");
      }

      nextStep();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao salvar etapa.";
      setStatusMessage(message);
    } finally {
      setSubmitting(false);
    }
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

  return (
    <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl flex-col px-4 pb-10 pt-6 sm:px-6">
      <div className="mb-6 rounded-2xl border border-white/50 bg-white/70 p-4 shadow-sm backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Etapa {currentStep} de {totalSteps}
        </p>
        <div className="mt-2 h-2 w-full rounded-full bg-slate-200">
          <motion.div
            className="h-2 rounded-full bg-orange-500"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.35 }}
          />
        </div>
      </div>

      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-full bg-indigo-900 text-xl text-white shadow-lg">
          🤖
        </div>
        <div className="flex-1">
          <StepMessage text={stepText} />
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-white/50 bg-white/70 p-4 shadow-sm backdrop-blur">
        {currentStep === 1 && (
          <button
            type="button"
            className="rounded-full bg-indigo-900 px-4 py-2 text-sm font-semibold text-white"
            onClick={saveAndContinue}
            disabled={isSubmitting}
          >
            Vamos la!
          </button>
        )}

        {currentStep === 2 && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => patchData({ role: "LAWYER" })}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${
                data.role === "LAWYER"
                  ? "border-indigo-900 bg-indigo-900 text-white"
                  : "border-slate-300 text-slate-700"
              }`}
            >
              Sou Advogado
            </button>
            <button
              type="button"
              onClick={() => patchData({ role: "CLIENT" })}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${
                data.role === "CLIENT"
                  ? "border-indigo-900 bg-indigo-900 text-white"
                  : "border-slate-300 text-slate-700"
              }`}
            >
              Sou Cliente
            </button>
            <button
              type="button"
              className="ml-auto rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
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
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600"
            />
            <input
              placeholder="Email"
              type="email"
              value={data.email}
              onChange={(event) => patchData({ email: event.target.value })}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600"
            />
            <input
              placeholder="WhatsApp"
              value={data.phone}
              onChange={(event) => patchData({ phone: event.target.value })}
              className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={sendOtp}
                className="rounded-full border border-indigo-900 px-4 py-2 text-sm font-semibold text-indigo-900"
              >
                Enviar OTP
              </button>
              <input
                placeholder="Codigo"
                value={data.otpCode}
                onChange={(event) => patchData({ otpCode: event.target.value })}
                className="h-10 flex-1 rounded-full border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={verifyOtp}
                className="rounded-full bg-indigo-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Validar
              </button>
            </div>

            <label className="flex items-start gap-2 text-xs text-slate-600">
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
              className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
              onClick={saveAndContinue}
              disabled={
                isSubmitting ||
                !data.fullName ||
                !data.email ||
                !data.phone ||
                !data.phoneVerified ||
                !data.consentAccepted
              }
            >
              Continuar
            </button>
          </div>
        )}

        {currentStep === 4 && (
          <div className="grid gap-3">
            {isLawyer ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  {planCatalog.map((plan) => {
                    const selected = data.selectedPlan === plan.id;
                    const highlight = plan.id === "PRIMUM";
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => patchData({ selectedPlan: plan.id as PlanId })}
                        className={`rounded-2xl border p-3 text-left transition ${
                          selected
                            ? "border-indigo-900 bg-indigo-900 text-white"
                            : highlight
                              ? "border-orange-500 bg-orange-50"
                              : "border-slate-200 bg-white"
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
                  className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
                  onClick={saveAndContinue}
                  disabled={!data.selectedPlan || isSubmitting}
                >
                  Continuar
                </button>
              </>
            ) : (
              <button
                type="button"
                className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
                onClick={saveAndContinue}
                disabled={isSubmitting}
              >
                Continuar
              </button>
            )}
          </div>
        )}

        {currentStep === 5 && (
          <div className="grid gap-3">
            {isLawyer ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {practiceAreaOptions.map((area) => {
                    const selected = data.practiceAreas.includes(area);
                    return (
                      <button
                        key={area}
                        type="button"
                        onClick={() => togglePracticeArea(area)}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                          selected
                            ? "border-indigo-900 bg-indigo-900 text-white"
                            : "border-slate-300 text-slate-700"
                        }`}
                      >
                        {area}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
                  onClick={saveAndContinue}
                  disabled={data.practiceAreas.length === 0 || isSubmitting}
                >
                  Finalizar cadastro
                </button>
              </>
            ) : (
              <button
                type="button"
                className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white"
                onClick={saveAndContinue}
                disabled={isSubmitting}
              >
                Finalizar cadastro
              </button>
            )}
          </div>
        )}

        {currentStep === 6 && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-indigo-900 border-r-transparent" />
            Criando conta e preparando seu dashboard...
          </div>
        )}

        {statusMessage && <p className="text-xs text-slate-600">{statusMessage}</p>}

        {otpStatus === "verified" && (
          <p className="text-xs font-semibold text-emerald-600">WhatsApp verificado.</p>
        )}

        <div className="flex justify-between">
          <button
            type="button"
            onClick={previousStep}
            disabled={currentStep === 1 || isSubmitting}
            className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 disabled:opacity-30"
          >
            Voltar
          </button>
        </div>
      </div>
    </section>
  );
}
