import { z } from "zod";

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const normalizePhoneDigits = (value: string) => value.replace(/\D/g, "");
const normalizeText = (value: string) => value.trim().replace(/\s+/g, " ");

const optionalUrl = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().url().optional()
);

const completeOnboardingPayloadSchema = z
  .object({
    sessionId: z.string().min(10),
    fullName: z.string().transform((value) => normalizeText(value)).pipe(z.string().min(2).max(120)),
    age: z.number().int().min(18).max(120).optional(),
    gender: z.enum(["M", "F", "O"]).optional(),
    email: z.string().trim().toLowerCase().email(),
    phone: z
      .string()
      .transform((value) => normalizePhoneDigits(value))
      .refine((value) => value.length >= 10 && value.length <= 11, {
        message: "WhatsApp invalido. Use DDD + numero.",
      }),
    password: z.string().refine((value) => strongPasswordRegex.test(value), {
      message: "Senha fraca. Use 8+ caracteres com maiuscula, minuscula e numero.",
    }),
    phoneVerified: z.boolean(),
    consentAccepted: z.boolean(),
    role: z.enum(["LAWYER", "CLIENT"]),
    officeName: z.string().min(2).optional(),
    officeLogoUrl: optionalUrl,
    oabNumber: z.string().min(4).max(12).optional(),
    oabState: z.string().length(2).optional(),
    clientLegalArea: z.string().optional(),
    selectedPlan: z.enum(["START", "PRO", "PREMIUM"]).optional(),
    practiceAreas: z.array(z.string()).default([]),
  })
  .superRefine((payload, ctx) => {
    if (payload.role !== "LAWYER") {
      return;
    }

    if (!payload.officeName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["officeName"],
        message: "Nome do escritorio obrigatorio para advogado.",
      });
    }

    if (!payload.oabNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["oabNumber"],
        message: "Numero da OAB obrigatorio para advogado.",
      });
    }

    if (!payload.oabState) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["oabState"],
        message: "Estado da OAB obrigatorio para advogado.",
      });
    }

    if (!payload.age) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["age"],
        message: "Idade obrigatoria para advogado.",
      });
    }

    if (!payload.gender) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["gender"],
        message: "Genero obrigatorio para advogado.",
      });
    }
  });

export type CompleteOnboardingPayload = z.infer<typeof completeOnboardingPayloadSchema>;

export async function completeOnboarding(payload: CompleteOnboardingPayload) {
  const parsed = completeOnboardingPayloadSchema.parse(payload);

  const response = await fetch("/api/onboarding/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parsed),
  });

  if (!response.ok) {
    const fallbackMessage = "Nao foi possivel concluir o onboarding.";
    const errorPayload = (await response.json().catch(() => null)) as
      | {
          code?: string;
          message?: string;
          traceId?: string;
          stage?: string;
          issues?: Array<{ path?: Array<string | number>; message?: string }>;
        }
      | null;

    const messageByCode: Record<string, string> = {
      VALIDATION_ERROR: "Revise os campos obrigatorios e tente novamente.",
      CONSENT_REQUIRED: "Voce precisa aceitar os termos para concluir o cadastro.",
      PLAN_REQUIRED: "Selecione um plano para concluir o cadastro profissional.",
      OAB_ALREADY_REGISTERED: "Esta OAB ja esta vinculada a outro cadastro.",
      EMAIL_ALREADY_REGISTERED: "Este email ja possui cadastro. Tente entrar na sua conta.",
      ONBOARDING_COMPLETE_RATE_LIMIT: "Muitas tentativas em sequencia. Aguarde alguns segundos e tente novamente.",
      ONBOARDING_SESSION_INVALID: "Sua sessao expirou. Recarregue a pagina e continue o cadastro.",
      ONBOARDING_SESSION_LOOKUP_FAILED: "Nao foi possivel validar sua sessao agora. Tente novamente.",
      CHECKOUT_INIT_FAILED: "Conta criada, mas falha ao iniciar checkout. Tente novamente em instantes.",
      CLIENT_ONBOARDING_DISABLED: "Cadastro de cliente com conta foi desativado. Use a inscricao publica para solicitar contato juridico.",
      DATABASE_NOT_CONFIGURED: "Servico temporariamente indisponivel. Tente novamente em alguns minutos.",
      AUTH_USER_CREATE_FAILED: "Nao foi possivel criar seu acesso agora. Tente novamente em instantes.",
      DATABASE_CONSTRAINT_FAILED: "Conflito de dados no cadastro. Revise os dados e tente novamente.",
      DATABASE_REQUEST_FAILED: "Falha ao salvar no banco de dados. Tente novamente em instantes.",
      DATABASE_UNKNOWN_ERROR: "Erro temporario ao processar seu cadastro. Tente novamente.",
      DATABASE_ENGINE_PANIC: "Instabilidade temporaria no banco de dados. Tente novamente em instantes.",
      DATABASE_SCHEMA_MISMATCH: "Sistema em atualizacao de banco. Tente novamente em alguns minutos.",
      DATABASE_CONNECTION_FAILED: "Nao foi possivel conectar ao banco para concluir seu cadastro. Tente novamente em instantes.",
      ONBOARDING_COMPLETE_UNEXPECTED: "Falha temporaria ao concluir cadastro. Tente novamente em instantes.",
    };

    const issues = errorPayload?.issues
      ?.map((issue) => {
        const field = issue.path?.length ? String(issue.path[issue.path.length - 1]) : "";
        if (field && issue.message) return `${field}: ${issue.message}`;
        return issue.message;
      })
      .filter(Boolean)
      .join(" | ");

    const mapped = errorPayload?.code ? messageByCode[errorPayload.code] : undefined;
    const isDev = process.env.NODE_ENV !== "production";
    const debug = [
      errorPayload?.traceId ? `trace: ${errorPayload.traceId}` : undefined,
      errorPayload?.stage ? `stage: ${errorPayload.stage}` : undefined,
    ]
      .filter(Boolean)
      .join(" | ");

    const primaryMessage = mapped ?? errorPayload?.message ?? fallbackMessage;
    const devDetails = isDev ? [issues, debug].filter(Boolean).join(" - ") : "";
    const message = [primaryMessage, devDetails].filter(Boolean).join(" - ");
    throw new Error(message);
  }

  return response.json() as Promise<{
    success: boolean;
    nextPath: string;
    paymentPending: boolean;
    checkoutUrl: string | null;
  }>;
}