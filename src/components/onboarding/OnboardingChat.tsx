"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
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
            className="rounded-3xl border border-[#3d2a5a] bg-[#1b0c33]/95 p-5 text-center text-sm text-white shadow-[0_12px_36px_-22px_rgba(232,71,42,0.75)]"
        >
            {text}
        </motion.div>
    );
}

type OnboardingChatProps = {
    initialRole?: "LAWYER" | "CLIENT";
    initialEntry?: "leads";
};

type LockedLeadPreview = {
    id: string;
    name: string;
    state: string;
    urgent: boolean;
    area: string;
    needText: string;
    interestedCount: number;
    interestedLimit: number;
};

export function OnboardingChat({ initialRole, initialEntry }: OnboardingChatProps) {
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
    const [selectedLockedLead, setSelectedLockedLead] = useState<string | null>(null);
    const [lockedLeads, setLockedLeads] = useState<LockedLeadPreview[]>([]);
    const [loadingLockedLeads, setLoadingLockedLeads] = useState(false);
    const isLawyer = data.role === "LAWYER";
    const showLawyerLeadGate = initialEntry === "leads" && isLawyer && currentStep === 1;

    const progress = (currentStep / totalSteps) * 100;

    const stepTitle = useMemo(() => {
        if (currentStep === 1) return "Receba ate 5 contatos";
        if (currentStep === 2) return "Selecione sua opcao";
        if (currentStep === 3) return "Dados para contato";
        if (currentStep === 4) return isLawyer ? "Escolha seu plano" : "Nivel de urgencia";
        if (currentStep === 5) return isLawyer ? "Areas de atuacao" : "Finalizar";
        if (currentStep === 6) return "Quase pronto";
        return "Criando sua conta";
    }, [currentStep, isLawyer]);

    const stepText = useMemo(() => {
        if (showLawyerLeadGate) {
            return "Voce recebeu leads bloqueados. Escolha um lead, selecione seu plano e desbloqueie para continuar o cadastro.";
        }

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
    }, [currentStep, isLawyer, showLawyerLeadGate]);

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

    useEffect(() => {
        if (!showLawyerLeadGate) return;

        let mounted = true;

        const loadLockedLeads = async () => {
            setLoadingLockedLeads(true);
            try {
                const response = await fetch("/api/onboarding/lawyer-leads", {
                    cache: "no-store",
                });

                if (!response.ok) {
                    throw new Error("Falha ao carregar leads bloqueados.");
                }

                const json = (await response.json()) as {
                    success: boolean;
                    leads: LockedLeadPreview[];
                };

                if (!mounted) return;
                setLockedLeads(json.leads ?? []);
            } catch {
                if (!mounted) return;
                setStatusMessage("Nao foi possivel carregar os leads agora.");
                setLockedLeads([]);
            } finally {
                if (mounted) {
                    setLoadingLockedLeads(false);
                }
            }
        };

        void loadLockedLeads();

        return () => {
            mounted = false;
        };
    }, [showLawyerLeadGate]);

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

    function handleUnlockAndContinue() {
        if (!data.selectedPlan || !selectedLockedLead) {
            setStatusMessage("Selecione um lead e um plano para desbloquear.");
            return;
        }

        setStatusMessage(
            "Plano selecionado. Complete seu cadastro para finalizar o pagamento e ativar os desbloqueios."
        );
        setStep(3);
    }

    function getInitials(name: string) {
        const [first = "", second = ""] = name.split(" ");
        return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
    }

    return (
        <section className="mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-6xl gap-5 px-4 pb-10 pt-6 lg:grid-cols-[minmax(0,620px)_minmax(0,1fr)]">
            <div className="space-y-4 rounded-3xl border border-[#3d2a5a] bg-[#1b0c33]/88 p-4 shadow-xl backdrop-blur sm:p-5">
                <div className="rounded-3xl border border-[#3d2a5a] bg-[#231540]/90 p-4 text-center shadow-xl backdrop-blur">
                    <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#e8472a]">
                        {stepTitle}
                    </p>
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
                {showLawyerLeadGate && (
                    <div className="grid gap-3">
                        {loadingLockedLeads && (
                            <p className="rounded-xl border border-[#3d2a5a] bg-[#1a0a2e] px-3 py-2 text-xs text-[#a89bc2]">
                                Carregando leads bloqueados...
                            </p>
                        )}

                        {!loadingLockedLeads && lockedLeads.length === 0 && (
                            <p className="rounded-xl border border-[#3d2a5a] bg-[#1a0a2e] px-3 py-2 text-xs text-[#a89bc2]">
                                Nenhum lead bloqueado disponivel no momento.
                            </p>
                        )}

                        <div className="grid gap-3 md:grid-cols-2">
                            {lockedLeads.map((lead) => {
                                const selected = selectedLockedLead === lead.id;

                                return (
                                    <article
                                        key={lead.id}
                                        className={`rounded-2xl border p-3 text-left transition ${selected
                                            ? "border-[#e8472a] bg-[#2d1b4e]"
                                            : "border-[#3d2a5a] bg-[#1a0a2e]"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#3d2a5a] bg-[#231540] text-xs font-bold text-white">
                                                    {getInitials(lead.name)}
                                                </span>
                                                <div>
                                                    <p className="text-sm font-semibold text-white">{lead.name}</p>
                                                    <p className="text-xs text-[#a89bc2]">{lead.state.toUpperCase()}</p>
                                                </div>
                                            </div>

                                            {lead.urgent ? (
                                                <span className="rounded-full border border-[#ff4a3a] bg-[#ff4a3a]/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#ff4a3a]">
                                                    Urgente
                                                </span>
                                            ) : null}
                                        </div>

                                        <div className="mt-3 flex items-center justify-between text-[11px] text-[#a89bc2]">
                                            <span>Especialidade</span>
                                            <span className="font-semibold text-white">{lead.area}</span>
                                        </div>

                                        <p className="mt-2 text-xs text-[#a89bc2]">{lead.needText}</p>

                                        <div className="mt-3">
                                            <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-[#a89bc2]">
                                                <span>Interessados</span>
                                                <span>
                                                    {lead.interestedCount}/{lead.interestedLimit}
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-[#120021]">
                                                <div
                                                    className="h-1.5 rounded-full bg-[#e8472a]"
                                                    style={{ width: `${(lead.interestedCount / lead.interestedLimit) * 100}%` }}
                                                />
                                            </div>
                                        </div>

                                        <span className="mt-3 inline-flex rounded-full border border-[#e8472a] bg-[#e8472a]/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#e8472a]">
                                            Lead bloqueado
                                        </span>

                                        <div className="mt-3 flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedLockedLead(lead.id)}
                                                className="inline-flex h-8 items-center justify-center rounded-md bg-[#ff3c25] px-3 text-[11px] font-bold uppercase tracking-wide text-white transition hover:bg-[#d93420]"
                                            >
                                                Desbloquear
                                            </button>
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#a89bc2]"
                                            >
                                                <Bookmark size={13} /> Favoritar
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3">
                            {planCatalog.map((plan) => {
                                const selected = data.selectedPlan === plan.id;

                                return (
                                    <button
                                        key={plan.id}
                                        type="button"
                                        onClick={() => patchData({ selectedPlan: plan.id as PlanId })}
                                        className={`rounded-2xl border p-3 text-left ${selected
                                            ? "border-[#e8472a] bg-[#e8472a] text-white"
                                            : "border-[#3d2a5a] bg-[#1a0a2e] text-white"
                                            }`}
                                    >
                                        <p className="text-xs font-semibold uppercase tracking-wide">{plan.name}</p>
                                        <p className="mt-1 text-[11px]">
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
                            onClick={handleUnlockAndContinue}
                            disabled={!selectedLockedLead || !data.selectedPlan || isSubmitting}
                        >
                            Desbloquear e continuar
                        </button>
                    </div>
                )}

                {currentStep === 1 && !showLawyerLeadGate && (
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
                            onClick={() => patchData({ role: "LAWYER" })}
                            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide ${data.role === "LAWYER"
                                ? "border-[#e8472a] bg-[#e8472a] text-white"
                                : "border-[#3d2a5a] bg-white text-[#1a0a2e]"
                                }`}
                        >
                            Sou Advogado
                        </button>
                        <button
                            type="button"
                            onClick={() => patchData({ role: "CLIENT" })}
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
                        <input
                            placeholder="Email"
                            type="email"
                            value={data.email}
                            onChange={(event) => patchData({ email: event.target.value })}
                            className="h-12 rounded-full border border-[#e8472a] bg-white px-4 text-sm text-[#1a0a2e] outline-none"
                        />
                        <input
                            placeholder="WhatsApp"
                            type="tel"
                            value={data.phone}
                            onChange={(event) => patchData({ phone: event.target.value })}
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
                                placeholder="Código"
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

                        <p className="text-xs text-[#a89bc2]">
                            Validacao de WhatsApp esta opcional temporariamente. Voce pode continuar sem OTP.
                        </p>

                        <label className="flex items-start gap-2 rounded-xl border border-[#3d2a5a]/70 bg-[#1a0a2e]/60 px-3 py-2 text-xs text-[#a89bc2]">
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
                            className="h-12 rounded-full bg-[#e8472a] px-4 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#c73d22]"
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
                                    disabled={data.practiceAreas.length === 0 || isSubmitting}
                                >
                                    Revisar cadastro
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                className="h-12 rounded-full bg-[#e8472a] px-4 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#c73d22]"
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
                            className="mt-1 h-12 rounded-full bg-[#e8472a] px-4 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#c73d22]"
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
                            className="rounded-full border border-[#3d2a5a] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#a89bc2] disabled:opacity-30"
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            </div>

            <aside className="hidden rounded-3xl border border-[#3d2a5a] bg-[#231540]/86 p-5 shadow-xl backdrop-blur lg:block">
                <h3 className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a89bc2]">Resumo da jornada</h3>
                <ol className="mt-4 space-y-3">
                    {["Boas-vindas", "Perfil", "Dados basicos", "Plano", "Areas", "Confirmacao"].map((label, index) => {
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
                        Preencha seus dados completos para liberar o acesso e acelerar a ativacao da conta.
                    </p>
                </div>
            </aside>
        </section>
    );
}
