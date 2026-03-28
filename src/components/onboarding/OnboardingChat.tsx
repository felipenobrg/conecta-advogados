"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
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

type FieldErrors = Partial<Record<
    | "fullName"
    | "email"
    | "phone"
    | "password"
    | "otpCode"
    | "age"
    | "gender"
    | "consentAccepted"
    | "officeName"
    | "officeLogoUrl"
    | "oabNumber"
    | "oabState"
    | "selectedPlan"
    | "practiceAreas"
    | "clientLegalArea",
    string
>>;

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizePhoneDigits(value: string) {
    return value.replace(/\D/g, "");
}

function formatWhatsappMask(value: string) {
    const digits = normalizePhoneDigits(value).slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function normalizeOabNumber(value: string) {
    return value.replace(/\D/g, "").slice(0, 12);
}

function toGenderLabel(gender?: Gender) {
    if (gender === "F") return "Feminino";
    if (gender === "M") return "Masculino";
    if (gender === "O") return "Outro";
    return "-";
}

function formatCurrencyBRL(amountInCents: number) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(amountInCents / 100);
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
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [lawyerStep3Substep, setLawyerStep3Substep] = useState<0 | 1 | 2>(0);
    const [statusMessage, setStatusMessage] = useState("");
    const [nextPath, setNextPath] = useState("/dashboard");
    const continueLockRef = useRef(false);

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
        if (!initialRole) return;
        if (currentStep === 2) {
            setStep(3);
        }
    }, [initialRole, currentStep, setStep]);

    useEffect(() => {
        if (currentStep !== totalSteps) return;

        const timer = setTimeout(() => {
            router.push(nextPath);
        }, 1500);

        return () => clearTimeout(timer);
    }, [currentStep, totalSteps, nextPath, router]);

    useEffect(() => {
        if (currentStep !== 3 || !isLawyer) {
            setLawyerStep3Substep(0);
        }
    }, [currentStep, isLawyer]);

    function clearFieldError(field: keyof FieldErrors) {
        setFieldErrors((current) => {
            if (!current[field]) {
                return current;
            }

            const next = { ...current };
            delete next[field];
            return next;
        });
    }

    function collectCurrentStepErrors(): FieldErrors {
        const errors: FieldErrors = {};
        const phoneDigits = normalizePhoneDigits(data.phone ?? "");

        if (currentStep === 3) {
            if (isLawyer) {
                if (lawyerStep3Substep === 0) {
                    if (!data.fullName?.trim()) errors.fullName = "Informe seu nome completo.";
                    if (!data.email?.trim()) {
                        errors.email = "Informe seu email.";
                    } else if (!emailRegex.test(data.email.trim().toLowerCase())) {
                        errors.email = "Email invalido.";
                    }

                    if (!phoneDigits) {
                        errors.phone = "Informe seu WhatsApp.";
                    } else if (phoneDigits.length < 10 || phoneDigits.length > 11) {
                        errors.phone = "WhatsApp invalido. Use DDD + numero.";
                    }
                }

                if (lawyerStep3Substep === 1) {
                    if (!data.password?.trim()) {
                        errors.password = "Crie uma senha.";
                    } else if (!strongPasswordRegex.test(data.password)) {
                        errors.password = "Senha fraca. Use 8+ caracteres com maiuscula, minuscula e numero.";
                    }

                    if (data.otpCode && data.otpCode.length > 0 && data.otpCode.length < 4) {
                        errors.otpCode = "Codigo OTP deve ter ao menos 4 digitos.";
                    }
                }

                if (lawyerStep3Substep === 2) {
                    if (!data.age || data.age < 18 || data.age > 120) {
                        errors.age = "Idade invalida. Informe entre 18 e 120.";
                    }
                    if (!data.gender) errors.gender = "Selecione seu genero.";
                    if (!data.consentAccepted) errors.consentAccepted = "Voce precisa aceitar os termos LGPD.";
                }

                return errors;
            }

            if (!data.fullName?.trim()) errors.fullName = "Informe seu nome completo.";
            if (!data.email?.trim()) {
                errors.email = "Informe seu email.";
            } else if (!emailRegex.test(data.email.trim().toLowerCase())) {
                errors.email = "Email invalido.";
            }

            if (!phoneDigits) {
                errors.phone = "Informe seu WhatsApp.";
            } else if (phoneDigits.length < 10 || phoneDigits.length > 11) {
                errors.phone = "WhatsApp invalido. Use DDD + numero.";
            }

            if (!data.password?.trim()) {
                errors.password = "Crie uma senha.";
            } else if (!strongPasswordRegex.test(data.password)) {
                errors.password = "Senha fraca. Use 8+ caracteres com maiuscula, minuscula e numero.";
            }

            if (!data.age || data.age < 18 || data.age > 120) errors.age = "Idade invalida. Informe entre 18 e 120.";
            if (!data.gender) errors.gender = "Selecione seu genero.";
            if (!data.consentAccepted) errors.consentAccepted = "Voce precisa aceitar os termos LGPD.";
        }

        if (isLawyer && currentStep === 4) {
            if (!data.officeName?.trim()) {
                errors.officeName = "Nome do escritorio obrigatorio.";
            } else if (data.officeName.trim().length < 2) {
                errors.officeName = "Nome do escritorio deve ter ao menos 2 caracteres.";
            }
        }

        if (isLawyer && currentStep === 5) {
            if (!data.oabNumber?.trim()) errors.oabNumber = "Numero da OAB obrigatorio.";
            if (!data.oabState?.trim()) errors.oabState = "Estado da OAB obrigatorio.";
        }

        if (isLawyer && currentStep === 6 && !data.selectedPlan) {
            errors.selectedPlan = "Escolha um plano para continuar.";
        }

        if (isLawyer && currentStep === 7 && (!data.practiceAreas || data.practiceAreas.length === 0)) {
            errors.practiceAreas = "Selecione ao menos uma area de atuacao.";
        }

        if (isClient && currentStep === 4 && !data.clientLegalArea) {
            errors.clientLegalArea = "Escolha a area principal do seu caso.";
        }

        return errors;
    }

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
                if (isLawyer) {
                    if (lawyerStep3Substep === 0) return "Informe seus dados principais para comecar.";
                    if (lawyerStep3Substep === 1) return "Defina seus dados de acesso e, se quiser, valide seu WhatsApp por OTP.";
                    return "Finalize seu perfil pessoal e consentimento LGPD.";
                }
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
    }, [currentStep, data.role, initialEntry, isClient, isLawyer, lawyerStep3Substep]);

    function canContinueCurrentStep() {
        if (currentStep === 1) return true;
        if (currentStep === 2) return Boolean(data.role);

        const fullName = data.fullName ?? "";
        const email = data.email ?? "";
        const phone = data.phone ?? "";
        const password = data.password ?? "";
        const officeName = data.officeName ?? "";
        const oabNumber = data.oabNumber ?? "";
        const oabState = data.oabState ?? "";
        const practiceAreas = data.practiceAreas ?? [];

        if (currentStep === 3) {
            if (isLawyer) {
                return Object.keys(collectCurrentStepErrors()).length === 0;
            }

            return (
                Boolean(fullName.trim()) &&
                Boolean(email.trim()) &&
                Boolean(phone.trim()) &&
                strongPasswordRegex.test(password) &&
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

        if (currentStep === 4) return Boolean(officeName.trim());

        if (currentStep === 5) {
            return Boolean(oabNumber.trim()) && Boolean(oabState.trim()) && Boolean(data.age) && Boolean(data.gender);
        }

        if (currentStep === 6) return Boolean(data.selectedPlan);
        if (currentStep === 7) return practiceAreas.length > 0;
        if (currentStep === 8) return true;

        return false;
    }

    async function sendOtp() {
        clearFieldError("phone");

        if (!data.phone) {
            setStatusMessage("Informe um WhatsApp valido antes de enviar o codigo.");
            return;
        }

        const phoneDigits = normalizePhoneDigits(data.phone);
        if (phoneDigits.length < 10 || phoneDigits.length > 11) {
            setFieldErrors((current) => ({ ...current, phone: "WhatsApp invalido. Use DDD + numero." }));
            setStatusMessage("WhatsApp invalido. Corrija o numero para enviar OTP.");
            return;
        }

        setIsSendingOtp(true);

        try {
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
        } catch {
            setStatusMessage("Falha de rede ao enviar OTP. Tente novamente.");
        } finally {
            setIsSendingOtp(false);
        }
    }

    async function verifyOtp() {
        clearFieldError("otpCode");

        if (data.otpCode.length < 4) {
            setFieldErrors((current) => ({ ...current, otpCode: "Digite um codigo OTP valido." }));
            setStatusMessage("Digite o codigo OTP recebido.");
            return;
        }

        setIsVerifyingOtp(true);

        try {
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
        } catch {
            setStatusMessage("Falha de rede ao validar OTP.");
        } finally {
            setIsVerifyingOtp(false);
        }
    }

    function togglePracticeArea(area: string) {
        const hasArea = data.practiceAreas.includes(area);
        patchData({
            practiceAreas: hasArea
                ? data.practiceAreas.filter((item) => item !== area)
                : [...data.practiceAreas, area],
        });
    }

    async function persistCurrentStep() {
        await persistStep({
            sessionId,
            step: currentStep,
            data: {
                ...data,
                password: "",
            },
        });
    }

    function goBackLawyerStep3Substep() {
        setStatusMessage("");
        setFieldErrors((current) => {
            if (lawyerStep3Substep === 2) {
                const next = { ...current };
                delete next.age;
                delete next.gender;
                delete next.consentAccepted;
                return next;
            }

            if (lawyerStep3Substep === 1) {
                const next = { ...current };
                delete next.password;
                delete next.otpCode;
                return next;
            }

            return current;
        });
        setLawyerStep3Substep((current) => (current > 0 ? ((current - 1) as 0 | 1 | 2) : current));
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
        if (continueLockRef.current) {
            return;
        }

        continueLockRef.current = true;
        setStatusMessage("");
        setSubmitting(true);

        try {
            const stepErrors = collectCurrentStepErrors();
            if (Object.keys(stepErrors).length > 0) {
                setFieldErrors(stepErrors);
                const firstError = Object.values(stepErrors)[0] ?? "Preencha os campos obrigatorios para continuar.";
                setStatusMessage(firstError);
                return;
            }

            setFieldErrors({});

            if (isLawyer && currentStep === 3 && lawyerStep3Substep < 2) {
                await persistCurrentStep();
                setLawyerStep3Substep((current) => (current < 2 ? ((current + 1) as 0 | 1 | 2) : current));
                return;
            }

            if (data.role) {
                document.cookie = `app_role=${data.role}; Path=/; Max-Age=2592000; SameSite=Lax`;
            }

            await persistCurrentStep();

            if (currentStep === 1) {
                if (initialRole) {
                    if (data.role !== initialRole) {
                        setRole(initialRole);
                    }
                    setStep(3);
                    return;
                }

                setStep(2);
                return;
            }

            if (currentStep === 2 && data.role) {
                setStep(3);
                return;
            }

            if (isClient) {
                if (currentStep === 3) return setStep(4);
                if (currentStep === 4) return setStep(5);
                if (currentStep === 5) return setStep(6);
                if (currentStep === 6) {
                    await finishOnboarding();
                    return;
                }
            }

            if (isLawyer) {
                if (currentStep === 3) return setStep(4);
                if (currentStep === 4) return setStep(5);
                if (currentStep === 5) return setStep(6);
                if (currentStep === 6) return setStep(7);
                if (currentStep === 7) return setStep(8);
                if (currentStep === 8) {
                    await finishOnboarding();
                    return;
                }
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : "Erro ao salvar etapa.";
            setStatusMessage(message);
        } finally {
            continueLockRef.current = false;
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

                    {currentStep === 2 && !initialRole && (
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
                            {isLawyer && (
                                <div className="rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e]/60 p-3 text-xs text-[#a89bc2]">
                                    <p className="font-semibold uppercase tracking-[0.16em] text-white">
                                        Subetapa {lawyerStep3Substep + 1} de 3
                                    </p>
                                    <p className="mt-1">Aproximadamente 1 minuto restante.</p>
                                </div>
                            )}

                            {(!isLawyer || lawyerStep3Substep === 0) && (
                                <>
                                    <input
                                        placeholder="Nome completo"
                                        value={data.fullName}
                                        onChange={(event) => {
                                            patchData({ fullName: event.target.value });
                                            clearFieldError("fullName");
                                        }}
                                        className={`h-12 rounded-full border bg-white px-4 text-sm text-[#1a0a2e] outline-none ${fieldErrors.fullName ? "border-rose-500" : "border-[#e8472a]"}`}
                                    />
                                    {fieldErrors.fullName && <p className="text-xs text-rose-300">{fieldErrors.fullName}</p>}

                                    <input
                                        placeholder="Email"
                                        type="email"
                                        value={data.email}
                                        onChange={(event) => {
                                            patchData({ email: event.target.value.trim().toLowerCase() });
                                            clearFieldError("email");
                                        }}
                                        className={`h-12 rounded-full border bg-white px-4 text-sm text-[#1a0a2e] outline-none ${fieldErrors.email ? "border-rose-500" : "border-[#e8472a]"}`}
                                    />
                                    {fieldErrors.email && <p className="text-xs text-rose-300">{fieldErrors.email}</p>}

                                    <input
                                        placeholder="Numero de WhatsApp"
                                        type="tel"
                                        value={data.phone}
                                        onChange={(event) => {
                                            patchData({ phone: formatWhatsappMask(event.target.value) });
                                            clearFieldError("phone");
                                        }}
                                        className={`h-12 rounded-full border bg-white px-4 text-sm text-[#1a0a2e] outline-none ${fieldErrors.phone ? "border-rose-500" : "border-[#e8472a]"}`}
                                    />
                                    {fieldErrors.phone && <p className="text-xs text-rose-300">{fieldErrors.phone}</p>}
                                </>
                            )}

                            {(!isLawyer || lawyerStep3Substep === 1) && (
                                <>
                                    <input
                                        placeholder="Crie uma senha forte"
                                        type="password"
                                        value={data.password}
                                        onChange={(event) => {
                                            patchData({ password: event.target.value });
                                            clearFieldError("password");
                                        }}
                                        className={`h-12 rounded-full border bg-white px-4 text-sm text-[#1a0a2e] outline-none ${fieldErrors.password ? "border-rose-500" : "border-[#e8472a]"}`}
                                    />
                                    <p className="text-[11px] text-[#a89bc2]">
                                        Use 8+ caracteres com letra maiuscula, minuscula e numero.
                                    </p>
                                    {fieldErrors.password && <p className="text-xs text-rose-300">{fieldErrors.password}</p>}

                                    <div className="flex flex-col gap-2 sm:flex-row">
                                        <button
                                            type="button"
                                            onClick={sendOtp}
                                            disabled={isSendingOtp}
                                            className="min-h-11 rounded-full border border-[#3d2a5a] bg-[#231540] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[#2d1b4e] disabled:opacity-60"
                                        >
                                            {isSendingOtp ? "Enviando OTP..." : "Enviar OTP (opcional)"}
                                        </button>
                                        <input
                                            placeholder="Codigo"
                                            value={data.otpCode}
                                            onChange={(event) => {
                                                patchData({ otpCode: event.target.value });
                                                clearFieldError("otpCode");
                                            }}
                                            className={`h-11 flex-1 rounded-full border bg-white px-3 text-sm text-[#1a0a2e] outline-none ${fieldErrors.otpCode ? "border-rose-500" : "border-[#e8472a]"}`}
                                        />
                                        <button
                                            type="button"
                                            onClick={verifyOtp}
                                            disabled={isVerifyingOtp}
                                            className="min-h-11 rounded-full bg-[#e8472a] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-[#c73d22] disabled:opacity-60"
                                        >
                                            {isVerifyingOtp ? "Validando..." : "Validar"}
                                        </button>
                                    </div>
                                    {fieldErrors.otpCode && <p className="text-xs text-rose-300">{fieldErrors.otpCode}</p>}
                                    {isLawyer && (
                                        <p className="text-[11px] text-[#a89bc2]">Validar OTP e opcional, mas recomendado para seguranca.</p>
                                    )}
                                </>
                            )}

                            {(!isLawyer || lawyerStep3Substep === 2) && (
                                <>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        <input
                                            placeholder="Idade"
                                            type="number"
                                            min={18}
                                            max={120}
                                            value={data.age ?? ""}
                                            onChange={(event) => {
                                                patchData({ age: event.target.value ? Number(event.target.value) : undefined });
                                                clearFieldError("age");
                                            }}
                                            className={`h-12 rounded-full border bg-white px-4 text-sm text-[#1a0a2e] outline-none ${fieldErrors.age ? "border-rose-500" : "border-[#e8472a]"}`}
                                        />
                                        <select
                                            value={data.gender ?? ""}
                                            onChange={(event) => {
                                                patchData({
                                                    gender: event.target.value ? (event.target.value as Gender) : undefined,
                                                });
                                                clearFieldError("gender");
                                            }}
                                            className={`h-12 rounded-full border bg-white px-4 text-sm text-[#1a0a2e] outline-none ${fieldErrors.gender ? "border-rose-500" : "border-[#e8472a]"}`}
                                        >
                                            <option value="">Genero</option>
                                            <option value="F">Feminino</option>
                                            <option value="M">Masculino</option>
                                            <option value="O">Outro</option>
                                        </select>
                                    </div>
                                    {fieldErrors.age && <p className="text-xs text-rose-300">{fieldErrors.age}</p>}
                                    {fieldErrors.gender && <p className="text-xs text-rose-300">{fieldErrors.gender}</p>}

                                    <label className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${fieldErrors.consentAccepted ? "border-rose-500 bg-rose-400/10 text-rose-200" : "border-[#3d2a5a]/70 bg-[#1a0a2e]/60 text-[#a89bc2]"}`}>
                                        <input
                                            type="checkbox"
                                            checked={data.consentAccepted}
                                            onChange={(event) => {
                                                patchData({ consentAccepted: event.target.checked });
                                                clearFieldError("consentAccepted");
                                            }}
                                            className="mt-1"
                                        />
                                        Concordo com os termos de uso e politica de privacidade (LGPD).
                                    </label>
                                </>
                            )}

                            <div className="flex gap-2">
                                {isLawyer && lawyerStep3Substep > 0 && (
                                    <button
                                        type="button"
                                        className="h-12 rounded-full border border-[#3d2a5a] px-4 text-xs font-bold uppercase tracking-[0.2em] text-[#a89bc2] transition hover:bg-[#2d1b4e]"
                                        onClick={goBackLawyerStep3Substep}
                                        disabled={isSubmitting}
                                    >
                                        Voltar etapa
                                    </button>
                                )}

                                <button
                                    type="button"
                                    className="h-12 flex-1 rounded-full bg-[#e8472a] px-4 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#c73d22]"
                                    onClick={saveAndContinue}
                                    disabled={!canContinueCurrentStep() || isSubmitting}
                                >
                                    {isLawyer && lawyerStep3Substep < 2 ? "Continuar" : "Continuar"}
                                </button>
                            </div>
                        </div>
                    )}

                    {currentStep === 4 && isLawyer && (
                        <div className="grid gap-3">
                            <input
                                placeholder="Nome do escritorio"
                                value={data.officeName}
                                onChange={(event) => {
                                    patchData({ officeName: event.target.value });
                                    clearFieldError("officeName");
                                }}
                                className={`h-12 rounded-full border bg-white px-4 text-sm text-[#1a0a2e] outline-none ${fieldErrors.officeName ? "border-rose-500" : "border-[#e8472a]"}`}
                            />
                            {fieldErrors.officeName && <p className="text-xs text-rose-300">{fieldErrors.officeName}</p>}
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
                                onChange={(event) => {
                                    patchData({ oabNumber: normalizeOabNumber(event.target.value) });
                                    clearFieldError("oabNumber");
                                }}
                                className={`h-12 rounded-full border bg-white px-4 text-sm text-[#1a0a2e] outline-none ${fieldErrors.oabNumber ? "border-rose-500" : "border-[#e8472a]"}`}
                            />
                            {fieldErrors.oabNumber && <p className="text-xs text-rose-300">{fieldErrors.oabNumber}</p>}
                            <select
                                value={data.oabState}
                                onChange={(event) => {
                                    patchData({ oabState: event.target.value });
                                    clearFieldError("oabState");
                                }}
                                className={`h-12 rounded-full border bg-white px-4 text-sm text-[#1a0a2e] outline-none ${fieldErrors.oabState ? "border-rose-500" : "border-[#e8472a]"}`}
                            >
                                <option value="">Estado OAB</option>
                                {oabStates.map((state) => (
                                    <option key={state} value={state}>
                                        {state}
                                    </option>
                                ))}
                            </select>
                            {fieldErrors.oabState && <p className="text-xs text-rose-300">{fieldErrors.oabState}</p>}
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
                            <div className="rounded-2xl border border-[#3d2a5a] bg-[#1a0a2e]/70 p-3 text-xs text-[#cfc1e4]">
                                Escolha seu plano para liberar os leads bloqueados. O plano Pro e o mais escolhido por escritorios em fase de crescimento.
                            </div>

                            <div className="grid gap-3 lg:grid-cols-3">
                                {planCatalog.map((plan) => {
                                    const selected = data.selectedPlan === plan.id;
                                    const isPro = plan.id === "PRO";
                                    const isPremium = plan.id === "PREMIUM";
                                    const contactsLabel = `${plan.leadsLimit.padStart(2, "0")} contatos qualificados`;
                                    return (
                                        <button
                                            key={plan.id}
                                            type="button"
                                            onClick={() => {
                                                patchData({ selectedPlan: plan.id as PlanId });
                                                clearFieldError("selectedPlan");
                                            }}
                                            className={`group rounded-2xl border p-4 text-left transition ${selected
                                                ? "border-[#e8472a] bg-[#e8472a]/18 text-white shadow-[0_18px_36px_-20px_rgba(232,71,42,0.9)]"
                                                : isPro
                                                    ? "border-[#e8472a] bg-[#2d1b4e] text-white hover:-translate-y-0.5"
                                                    : "border-[#3d2a5a] bg-[#1a0a2e] text-white hover:-translate-y-0.5"
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="text-lg font-black uppercase tracking-wide">{plan.name}</p>
                                                {isPro && (
                                                    <span className="rounded-full border border-[#ffb29f]/40 bg-[#ff6b4f]/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#ffd7ce]">
                                                        Mais escolhido
                                                    </span>
                                                )}
                                                {isPremium && (
                                                    <span className="rounded-full border border-[#f8d38c]/45 bg-[#f4b03a]/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#ffe7bb]">
                                                        Escala maxima
                                                    </span>
                                                )}
                                            </div>

                                            <p className="mt-2 text-2xl font-black">
                                                {formatCurrencyBRL(plan.amountInCents)}
                                            </p>

                                            <p className="mt-1 text-[11px] uppercase tracking-[0.15em] text-[#ffb29f]">
                                                {plan.type === "one_time" ? "Pagamento unico" : "Recorrente"}
                                            </p>

                                            <div className="mt-3 rounded-xl border border-[#3d2a5a] bg-[#120727]/70 px-3 py-2">
                                                <p className="text-sm font-bold uppercase tracking-wide">{contactsLabel}</p>
                                            </div>

                                            <ul className="mt-3 space-y-1.5 text-xs leading-5 text-[#e6ddf4]">
                                                {plan.features.map((feature) => (
                                                    <li key={`${plan.id}-${feature}`} className="flex items-start gap-2">
                                                        <span className="mt-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-[#e8472a]" />
                                                        <span>{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>

                                            <p className={`mt-3 text-[11px] font-semibold uppercase tracking-wide ${selected ? "text-white" : "text-[#a89bc2]"}`}>
                                                {selected ? "Plano selecionado" : "Clique para selecionar"}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                            {fieldErrors.selectedPlan && <p className="text-xs text-rose-300">{fieldErrors.selectedPlan}</p>}
                            <button
                                type="button"
                                className="h-12 rounded-full bg-[#e8472a] px-4 text-xs font-bold uppercase tracking-[0.2em] text-white transition hover:bg-[#c73d22] disabled:opacity-60"
                                onClick={saveAndContinue}
                                disabled={!canContinueCurrentStep() || isSubmitting}
                            >
                                {isSubmitting ? "Processando..." : "Continuar para areas"}
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
                                            onClick={() => {
                                                togglePracticeArea(area);
                                                clearFieldError("practiceAreas");
                                            }}
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
                            {fieldErrors.practiceAreas && <p className="text-xs text-rose-300">{fieldErrors.practiceAreas}</p>}
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
                                className="h-11 rounded-full border border-[#3d2a5a] px-4 text-[11px] font-bold uppercase tracking-[0.2em] text-[#a89bc2] transition hover:bg-[#2d1b4e]"
                                onClick={() => {
                                    setStatusMessage("");
                                    setFieldErrors((current) => {
                                        if (!current.selectedPlan) return current;
                                        const next = { ...current };
                                        delete next.selectedPlan;
                                        return next;
                                    });
                                    setStep(6);
                                }}
                                disabled={isSubmitting}
                            >
                                Trocar plano
                            </button>
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

                    {statusMessage && <p className="text-xs text-[#ffd2c8]">{statusMessage}</p>}
                    {otpStatus === "verified" && <p className="text-xs font-semibold text-emerald-400">WhatsApp verificado.</p>}
                    {isSubmitting && <p className="text-xs font-semibold text-[#ffb29f]">Salvando etapa...</p>}

                    {currentStep > 1 && currentStep < totalSteps && (
                        <div className="flex justify-between">
                            <button
                                type="button"
                                onClick={() => {
                                    if (isLawyer && currentStep === 3 && lawyerStep3Substep > 0) {
                                        goBackLawyerStep3Substep();
                                        return;
                                    }
                                    previousStep();
                                }}
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
