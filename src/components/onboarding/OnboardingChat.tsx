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
    "Família",
    "Tributário",
    "Previdenciário",
    "Empresarial",
];

function StepMessage({ text }: { text: string }) {
    return (
        <motion.div
            key={text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-3xl rounded-tl-md border border-[#3d2a5a] border-l-4 border-l-[#e8472a] bg-[#2d1b4e]/95 p-5 text-sm text-white shadow-[0_0_24px_rgba(232,71,42,0.14)]"
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
        setStep,
        nextStep,
        previousStep,
        setSubmitting,
        isSubmitting,
    } = useOnboardingStore();

    const [otpStatus, setOtpStatus] = useState<"idle" | "sent" | "verified">("idle");
    const [statusMessage, setStatusMessage] = useState<string>("");
    const [nextPath, setNextPath] = useState<string>("/dashboard");
    const isLawyer = data.role === "LAWYER";

    const progress = (currentStep / totalSteps) * 100;

    const stepText = useMemo(() => {
        switch (currentStep) {
            case 1:
                return "Olá! Sou o assistente do Conecta Advogados. Vou conduzir seu cadastro para ativar sua experiência na plataforma.";
            case 2:
                return "Você atua como advogado ou está buscando um advogado?";
            case 3:
                return "Perfeito. Agora precisamos validar seus dados e WhatsApp para garantir segurança na comunidade.";
            case 4:
                return isLawyer
                    ? "Escolha um plano para ativar sua conta profissional."
                    : "Qual área jurídica descreve melhor seu caso neste momento?";
            case 5:
                return "Quais áreas de atuação você deseja priorizar para receber leads?";
            case 6:
                return "Revise os dados e confirme o cadastro para finalizar sua configuração.";
            case 7:
            default:
                return "Tudo certo! Criando sua conta...";
        }
    }, [currentStep, isLawyer]);

    useEffect(() => {
        if (!initialRole) {
            return;
        }

        if (data.role !== initialRole) {
            patchData({ role: initialRole });
        }
    }, [initialRole, data.role, patchData]);

    useEffect(() => {
        if (currentStep !== 7) return;

        const timer = setTimeout(() => {
            router.push(nextPath);
        }, 1600);

        return () => clearTimeout(timer);
    }, [currentStep, nextPath, router]);

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

            if (currentStep === 4 && data.role === "CLIENT") {
                setStep(6);
                return;
            }

            if (currentStep === 5 && data.role === "LAWYER") {
                nextStep();
                return;
            }

            if (currentStep === 6) {
                const response = await completeOnboarding({
                    sessionId,
                    fullName: data.fullName,
                    email: data.email,
                    phone: data.phone,
                    phoneVerified: data.phoneVerified,
                    consentAccepted: data.consentAccepted,
                    role: data.role ?? "CLIENT",
                    selectedPlan: data.role === "LAWYER" ? data.selectedPlan : undefined,
                    practiceAreas: data.practiceAreas,
                });

                setNextPath(response.nextPath);

                if (response.paymentPending) {
                    if (!response.checkoutUrl) {
                        throw new Error("Nao foi possivel iniciar o checkout Stripe.");
                    }
                    setStatusMessage("Conta criada! Assinatura pendente de ativação. Redirecionando...");
                    window.location.assign(response.checkoutUrl);
                    return;
                } else {
                    setStatusMessage("Conta criada! Redirecionando...");
                }

                setStep(7);
                return;
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
            setStatusMessage("Informe um WhatsApp válido antes de enviar o código.");
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
            setStatusMessage(body?.message ?? "Não foi possível enviar OTP.");
            return;
        }

        setStatusMessage("Código enviado para seu WhatsApp.");
        setOtpStatus("sent");
    }

    async function verifyOtp() {
        if (data.otpCode.length < 4) {
            setStatusMessage("Digite o código OTP recebido.");
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
            setStatusMessage(body?.message ?? "OTP inválido.");
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
            <div className="mb-6 rounded-2xl border border-[#3d2a5a] bg-[#231540]/85 p-4 shadow-xl backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a89bc2]">
                    Etapa {currentStep} de {totalSteps}
                </p>
                <div className="mt-2 h-2 w-full rounded-full bg-[#2d1b4e]">
                    <motion.div
                        className="h-2 rounded-full bg-[#e8472a]"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.35 }}
                    />
                </div>
            </div>

            <div className="mb-4 flex items-start gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full border border-[#3d2a5a] bg-[#2d1b4e] text-xl text-white shadow-[0_0_20px_rgba(232,71,42,0.15)]">
                    🤖
                </div>
                <div className="flex-1">
                    <StepMessage text={stepText} />
                </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-[#3d2a5a] bg-[#231540]/92 p-4 shadow-xl backdrop-blur">
                {currentStep === 1 && (
                    <button
                        type="button"
                        className="rounded-full bg-[#e8472a] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#c73d22]"
                        onClick={saveAndContinue}
                        disabled={isSubmitting}
                    >
                        Vamos lá!
                    </button>
                )}

                {currentStep === 2 && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => patchData({ role: "LAWYER" })}
                            className={`rounded-full border px-4 py-2 text-sm font-medium ${data.role === "LAWYER"
                                ? "border-[#e8472a] bg-[#e8472a] text-white"
                                : "border-[#3d2a5a] text-[#a89bc2]"
                                }`}
                        >
                            Sou Advogado
                        </button>
                        <button
                            type="button"
                            onClick={() => patchData({ role: "CLIENT" })}
                            className={`rounded-full border px-4 py-2 text-sm font-medium ${data.role === "CLIENT"
                                ? "border-[#e8472a] bg-[#e8472a] text-white"
                                : "border-[#3d2a5a] text-[#a89bc2]"
                                }`}
                        >
                            Sou Cliente
                        </button>
                        <button
                            type="button"
                            className="ml-auto rounded-full bg-[#e8472a] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#c73d22]"
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
                            className="h-12 rounded-xl border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-sm text-white outline-none focus:border-[#e8472a]"
                        />
                        <input
                            placeholder="Email"
                            type="email"
                            value={data.email}
                            onChange={(event) => patchData({ email: event.target.value })}
                            className="h-12 rounded-xl border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-sm text-white outline-none focus:border-[#e8472a]"
                        />
                        <input
                            placeholder="WhatsApp"
                            type="tel"
                            value={data.phone}
                            onChange={(event) => patchData({ phone: event.target.value })}
                            className="h-12 rounded-xl border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-sm text-white outline-none focus:border-[#e8472a]"
                        />
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                                type="button"
                                onClick={sendOtp}
                                className="min-h-[44px] rounded-full border border-[#3d2a5a] px-4 py-2 text-sm font-semibold text-[#a89bc2] transition hover:bg-[#2d1b4e]"
                            >
                                Enviar OTP
                            </button>
                            <input
                                placeholder="Código"
                                value={data.otpCode}
                                onChange={(event) => patchData({ otpCode: event.target.value })}
                                className="h-11 flex-1 rounded-full border border-[#3d2a5a] bg-[#1a0a2e] px-3 text-sm text-white outline-none focus:border-[#e8472a]"
                            />
                            <button
                                type="button"
                                onClick={verifyOtp}
                                className="min-h-[44px] rounded-full bg-[#e8472a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c73d22]"
                            >
                                Validar
                            </button>
                        </div>

                        <p className="text-xs text-[#a89bc2]">
                            Validacao de WhatsApp esta opcional temporariamente. Voce pode continuar sem OTP.
                        </p>

                        <label className="flex items-start gap-2 rounded-xl border border-[#3d2a5a]/70 bg-[#1a0a2e]/60 px-3 py-2 text-sm text-[#a89bc2]">
                            <input
                                type="checkbox"
                                checked={data.consentAccepted}
                                onChange={(event) => patchData({ consentAccepted: event.target.checked })}
                                className="mt-1"
                            />
                            Concordo com os termos de uso e política de privacidade (LGPD).
                        </label>

                        <button
                            type="button"
                            className="rounded-full bg-[#e8472a] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#c73d22]"
                            onClick={saveAndContinue}
                            disabled={
                                isSubmitting ||
                                !data.fullName ||
                                !data.email ||
                                !data.phone ||
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
                                                className={`rounded-2xl border p-3 text-left transition ${selected
                                                    ? "border-[#e8472a] bg-[#e8472a] text-white"
                                                    : highlight
                                                        ? "border-[#e8472a] bg-[#2d1b4e] text-white"
                                                        : "border-[#3d2a5a] bg-[#1a0a2e] text-white"
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
                                    className="rounded-full bg-[#e8472a] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#c73d22]"
                                    onClick={saveAndContinue}
                                    disabled={!data.selectedPlan || isSubmitting}
                                >
                                    Continuar
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="flex flex-wrap gap-2">
                                    {practiceAreaOptions.map((area) => {
                                        const selected = data.practiceAreas.includes(area);
                                        return (
                                            <button
                                                key={area}
                                                type="button"
                                                onClick={() => togglePracticeArea(area)}
                                                className={`rounded-full border px-3 py-2 text-xs font-semibold ${selected
                                                    ? "border-[#e8472a] bg-[#e8472a] text-white"
                                                    : "border-[#3d2a5a] text-[#a89bc2]"
                                                    }`}
                                            >
                                                {area}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    type="button"
                                    className="rounded-full bg-[#e8472a] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#c73d22]"
                                    onClick={saveAndContinue}
                                    disabled={data.practiceAreas.length === 0 || isSubmitting}
                                >
                                    Continuar
                                </button>
                            </>
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
                                                className={`rounded-full border px-3 py-2 text-xs font-semibold ${selected
                                                    ? "border-[#e8472a] bg-[#e8472a] text-white"
                                                    : "border-[#3d2a5a] text-[#a89bc2]"
                                                    }`}
                                            >
                                                {area}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    type="button"
                                    className="rounded-full bg-[#e8472a] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#c73d22]"
                                    onClick={saveAndContinue}
                                    disabled={data.practiceAreas.length === 0 || isSubmitting}
                                >
                                    Revisar cadastro
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                className="rounded-full bg-[#e8472a] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#c73d22]"
                                onClick={saveAndContinue}
                                disabled={isSubmitting}
                            >
                                Finalizar cadastro
                            </button>
                        )}
                    </div>
                )}

                {currentStep === 6 && (
                    <div className="grid gap-3 rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e] p-4 text-sm text-[#a89bc2]">
                        <p>
                            <span className="font-semibold text-white">Nome:</span> {data.fullName || "-"}
                        </p>
                        <p>
                            <span className="font-semibold text-white">Email:</span> {data.email || "-"}
                        </p>
                        <p>
                            <span className="font-semibold text-white">Perfil:</span> {data.role === "LAWYER" ? "Advogado" : "Cliente"}
                        </p>
                        {data.role === "LAWYER" ? (
                            <p>
                                <span className="font-semibold text-white">Plano:</span> {data.selectedPlan || "-"}
                            </p>
                        ) : null}
                        <p>
                            <span className="font-semibold text-white">Áreas:</span> {data.practiceAreas.length > 0 ? data.practiceAreas.join(", ") : "-"}
                        </p>
                        <button
                            type="button"
                            className="mt-1 rounded-full bg-[#e8472a] px-4 py-2 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-[#c73d22]"
                            onClick={saveAndContinue}
                            disabled={isSubmitting}
                        >
                            Confirmar e criar conta
                        </button>
                    </div>
                )}

                {currentStep === 7 && (
                    <div className="flex items-center gap-3 rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e] p-4 text-sm text-[#a89bc2]">
                        <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-[#e8472a] border-r-transparent" />
                        Criando conta e preparando seu dashboard...
                    </div>
                )}

                {statusMessage && <p className="text-xs text-[#a89bc2]">{statusMessage}</p>}

                {otpStatus === "verified" && (
                    <p className="text-xs font-semibold text-emerald-400">WhatsApp verificado.</p>
                )}

                <div className="flex justify-between">
                    <button
                        type="button"
                        onClick={previousStep}
                        disabled={currentStep === 1 || isSubmitting}
                        className="rounded-full border border-[#3d2a5a] px-4 py-2 text-xs font-semibold text-[#a89bc2] disabled:opacity-30"
                    >
                        Voltar
                    </button>
                </div>
            </div>
        </section>
    );
}
