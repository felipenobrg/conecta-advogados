import { z } from "zod";

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
    fullName: z.string().min(2),
    age: z.number().int().min(18).max(120).optional(),
    gender: z.enum(["M", "F", "O"]).optional(),
    email: z.string().email(),
    phone: z.string().min(8),
    password: z.string().min(6),
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
          message?: string;
          issues?: Array<{ path?: Array<string | number>; message?: string }>;
        }
      | null;

    const issues = errorPayload?.issues
      ?.map((issue) => {
        const field = issue.path?.length ? String(issue.path[issue.path.length - 1]) : "";
        if (field && issue.message) return `${field}: ${issue.message}`;
        return issue.message;
      })
      .filter(Boolean)
      .join(" | ");

    const message = [errorPayload?.message, issues].filter(Boolean).join(" - ") || fallbackMessage;
    throw new Error(message);
  }

  return response.json() as Promise<{
    success: boolean;
    nextPath: string;
    paymentPending: boolean;
    checkoutUrl: string | null;
  }>;
}