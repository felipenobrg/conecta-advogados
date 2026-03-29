import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getPaymentProvider } from "@/lib/payment";

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const normalizePhoneDigits = (value: string) => value.replace(/\D/g, "");
const completeThrottleMs = 5000;
const completeAttempts = new Map<string, number>();
const allowedPracticeAreas = new Set([
  "Direito Civil",
  "Trabalhista",
  "Criminal",
  "Familia",
  "Tributario",
  "Previdenciario",
  "Empresarial",
]);

class OnboardingCompleteError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(params: { code: string; message: string; status: number; details?: Record<string, unknown> }) {
    super(params.message);
    this.code = params.code;
    this.status = params.status;
    this.details = params.details;
  }
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizeArea(value: string) {
  return normalizeText(value);
}

function normalizePracticeAreas(areas: string[]) {
  const unique = new Set(
    areas
      .map((area) => normalizeArea(area))
      .filter((area) => area.length > 0)
      .filter((area) => allowedPracticeAreas.has(area))
  );

  return Array.from(unique).slice(0, 10);
}

function getErrorName(error: unknown) {
  if (error instanceof Error) return error.name;
  if (error && typeof error === "object" && "name" in error && typeof (error as { name: unknown }).name === "string") {
    return (error as { name: string }).name;
  }
  return "UnknownError";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof (error as { message: unknown }).message === "string") {
    return (error as { message: string }).message;
  }
  return String(error);
}

function getErrorCode(error: unknown) {
  if (error && typeof error === "object" && "code" in error && typeof (error as { code: unknown }).code === "string") {
    return (error as { code: string }).code;
  }
  return undefined;
}

function getErrorMeta(error: unknown) {
  if (error && typeof error === "object" && "meta" in error) {
    return (error as { meta?: unknown }).meta;
  }
  return undefined;
}

function getAggregateErrorMessages(error: unknown) {
  if (!(error instanceof AggregateError)) {
    return [] as string[];
  }

  return error.errors
    .map((item) => {
      if (item instanceof Error) return item.message;
      return String(item);
    })
    .filter((message) => message.length > 0);
}

async function ensureSessionHasProgress(sessionId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!url || !serviceRoleKey) {
    throw new OnboardingCompleteError({
      code: "SUPABASE_NOT_CONFIGURED",
      message: "Supabase nao configurado para validar sessao do onboarding.",
      status: 500,
    });
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from("onboarding_steps")
    .select("step")
    .eq("session_id", sessionId)
    .order("step", { ascending: false })
    .limit(1);

  if (error) {
    throw new OnboardingCompleteError({
      code: "ONBOARDING_SESSION_LOOKUP_FAILED",
      message: "Nao foi possivel validar a sessao do onboarding.",
      status: 500,
    });
  }

  const maxStep = data?.[0]?.step ?? 0;
  if (maxStep < 2) {
    throw new OnboardingCompleteError({
      code: "ONBOARDING_SESSION_INVALID",
      message: "Sessao de onboarding invalida ou expirada. Recarregue a pagina e tente novamente.",
      status: 409,
    });
  }
}

const optionalUrl = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().url().optional()
);

const requestSchema = z
  .object({
    sessionId: z.string().min(10),
    fullName: z.string().transform((value) => normalizeText(value)).pipe(z.string().min(2).max(120)),
    age: z.number().int().min(18).max(120).optional(),
    gender: z.enum(["M", "F", "O"]).optional(),
    email: z.string().transform((value) => normalizeEmail(value)).pipe(z.string().email().max(191)),
    phone: z
      .string()
      .transform((value) => normalizePhoneDigits(value))
      .refine((value) => value.length >= 10 && value.length <= 11, {
        message: "WhatsApp invalido. Informe DDD + numero.",
      }),
    password: z.string().refine((value) => strongPasswordRegex.test(value), {
      message: "Senha fraca. Use 8+ caracteres com maiuscula, minuscula e numero.",
    }),
    phoneVerified: z.boolean(),
    consentAccepted: z.boolean(),
    role: z.enum(["LAWYER", "CLIENT"]),
    officeName: z
      .string()
      .transform((value) => normalizeText(value))
      .pipe(z.string().min(2).max(160))
      .optional(),
    officeLogoUrl: optionalUrl,
    oabNumber: z.string().regex(/^\d{4,12}$/, "Numero da OAB deve conter apenas numeros.").optional(),
    oabState: z.string().length(2).transform((value) => value.toUpperCase()).optional(),
    clientLegalArea: z.string().transform((value) => normalizeArea(value)).optional(),
    selectedPlan: z.enum(["START", "PRO", "PREMIUM"]).optional(),
    practiceAreas: z.array(z.string()).transform((areas) => normalizePracticeAreas(areas)).default([]),
  })
  .strict()
  .superRefine((payload, ctx) => {
    if (payload.role !== "LAWYER") {
      if (!payload.clientLegalArea || !allowedPracticeAreas.has(payload.clientLegalArea)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["clientLegalArea"],
          message: "Selecione uma area juridica valida para concluir seu cadastro.",
        });
      }
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

    if (!payload.practiceAreas.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["practiceAreas"],
        message: "Selecione ao menos uma area de atuacao valida.",
      });
    }
  });

async function ensureSupabaseAuthUser(input: {
  email: string;
  password: string;
  fullName: string;
  role: "LAWYER" | "CLIENT";
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!url || !serviceRoleKey) {
    throw new OnboardingCompleteError({
      code: "SUPABASE_NOT_CONFIGURED",
      message: "Supabase nao configurado para criar usuario de autenticacao.",
      status: 500,
    });
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      name: input.fullName,
      role: input.role,
    },
  });

  if (!error) {
    return { created: true };
  }

  const message = error.message.toLowerCase();
  const alreadyRegistered =
    message.includes("already") ||
    message.includes("exists") ||
    message.includes("registered") ||
    message.includes("duplicate");

  if (alreadyRegistered) {
    return { created: false };
  }

  throw new OnboardingCompleteError({
    code: "AUTH_USER_CREATE_FAILED",
    message: "Nao foi possivel criar sua conta de autenticacao neste momento.",
    status: 502,
  });
}

export async function POST(request: Request) {
  const traceId = globalThis.crypto?.randomUUID?.() ?? `onb-${Date.now()}`;
  let stage = "request:parse";
  const isDev = process.env.NODE_ENV !== "production";

  try {
    const body = await request.json();
    stage = "payload:validate";
    const payload = requestSchema.parse(body);

    const throttleKey = `${payload.sessionId}:${payload.email}`;
    const now = Date.now();
    const lastAttempt = completeAttempts.get(throttleKey) ?? 0;
    if (now - lastAttempt < completeThrottleMs) {
      return NextResponse.json(
        {
          success: false,
          code: "ONBOARDING_COMPLETE_RATE_LIMIT",
          message: "Muitas tentativas em sequencia. Aguarde alguns segundos e tente novamente.",
          traceId,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(completeThrottleMs / 1000)),
          },
        }
      );
    }
    completeAttempts.set(throttleKey, now);

    stage = "session:validate";
    await ensureSessionHasProgress(payload.sessionId);

    stage = "business:validate";
    if (!payload.consentAccepted) {
      return NextResponse.json(
        {
          success: false,
          code: "CONSENT_REQUIRED",
          message: "Consentimento LGPD obrigatorio.",
          traceId,
        },
        { status: 400 }
      );
    }

    if (payload.role === "CLIENT") {
      return NextResponse.json(
        {
          success: false,
          code: "CLIENT_ONBOARDING_DISABLED",
          message:
            "Cadastro de cliente pelo onboarding foi desativado. Use a inscricao publica de lead para solicitar contato.",
          traceId,
        },
        { status: 409 }
      );
    }

    if (payload.role === "LAWYER" && !payload.selectedPlan) {
      return NextResponse.json(
        {
          success: false,
          code: "PLAN_REQUIRED",
          message: "Advogado precisa selecionar um plano.",
          traceId,
        },
        { status: 400 }
      );
    }

    stage = "auth:create-user";
    const authUserResult = await ensureSupabaseAuthUser({
      email: payload.email,
      password: payload.password,
      fullName: payload.fullName,
      role: payload.role,
    });

    const selectedPlan = payload.selectedPlan ?? "START";
    const needsPayment = payload.role === "LAWYER" && (selectedPlan === "PRO" || selectedPlan === "PREMIUM");
    let checkoutUrl: string | null = null;

    stage = "db:transaction";
    const user = await prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.upsert({
        where: { email: payload.email },
        update: {
          name: payload.fullName,
          phone: payload.phone,
          whatsappVerified: payload.phoneVerified,
          role: payload.role,
          plan: needsPayment ? "START" : selectedPlan,
        },
        create: {
          email: payload.email,
          name: payload.fullName,
          phone: payload.phone,
          whatsappVerified: payload.phoneVerified,
          role: payload.role,
          plan: needsPayment ? "START" : selectedPlan,
        },
      });

      if (payload.role === "LAWYER") {
        await transaction.lawyerProfile.upsert({
          where: { userId: createdUser.id },
          update: {
            officeName: payload.officeName!,
            officeLogoUrl: payload.officeLogoUrl ?? null,
            oabNumber: payload.oabNumber!,
            oabState: payload.oabState!,
            age: payload.age!,
            gender: payload.gender!,
          },
          create: {
            userId: createdUser.id,
            officeName: payload.officeName!,
            officeLogoUrl: payload.officeLogoUrl ?? null,
            oabNumber: payload.oabNumber!,
            oabState: payload.oabState!,
            age: payload.age!,
            gender: payload.gender!,
          },
        });
      }

      return createdUser;
    });

    if (payload.role === "LAWYER") {
      if (needsPayment) {
        stage = "payment:provider-init";
        const provider = getPaymentProvider();
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
        try {
          stage = "payment:create-checkout";
          const checkout = await provider.createCheckout({
            userId: user.id,
            planId: selectedPlan,
            successUrl: `${appUrl}/dashboard?checkout=success`,
            cancelUrl: `${appUrl}/onboarding?checkout=canceled`,
            customerEmail: user.email,
          });

          await prisma.subscription.upsert({
            where: { userId: user.id },
            update: {
              provider: "stripe",
              providerId: `pending-${user.id}`,
              status: "PAST_DUE",
              plan: selectedPlan,
            },
            create: {
              userId: user.id,
              provider: "stripe",
              providerId: `pending-${user.id}`,
              status: "PAST_DUE",
              plan: selectedPlan,
            },
          });

          checkoutUrl = checkout.url;
        } catch {
          return NextResponse.json(
            {
              success: false,
              code: "CHECKOUT_INIT_FAILED",
              message: "Nao foi possivel iniciar o checkout agora. Tente novamente em instantes.",
              traceId,
            },
            { status: 502 }
          );
        }
      } else {
        stage = "subscription:activate-start";
        await prisma.subscription.upsert({
          where: { userId: user.id },
          update: {
            provider: "internal",
            providerId: `internal-${user.id}`,
            status: "ACTIVE",
            plan: "START",
          },
          create: {
            userId: user.id,
            provider: "internal",
            providerId: `internal-${user.id}`,
            status: "ACTIVE",
            plan: "START",
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      nextPath: payload.role === "LAWYER" ? "/dashboard" : "/client/dashboard",
      paymentPending: needsPayment,
      checkoutUrl,
      authUserCreated: authUserResult.created,
      sessionId: payload.sessionId,
      practiceAreasCount: payload.practiceAreas.length,
      traceId,
    });
  } catch (error) {
    const errorName = getErrorName(error);
    const errorMessage = getErrorMessage(error);
    const errorCode = getErrorCode(error);
    const errorMeta = getErrorMeta(error);
    const aggregateMessages = getAggregateErrorMessages(error);

    console.error("[onboarding.complete] fail", {
      traceId,
      stage,
      errorName,
      errorMessage,
      ...(aggregateMessages.length ? { aggregateMessages } : {}),
      ...(errorCode
        ? { prismaCode: errorCode, prismaMeta: errorMeta }
        : {}),
    });

    if (error instanceof OnboardingCompleteError) {
      return NextResponse.json(
        {
          success: false,
          code: error.code,
          message: error.message,
          traceId,
          stage,
        },
        { status: error.status }
      );
    }

    if (errorCode === "P2002") {
      const targets = Array.isArray(errorMeta) ? errorMeta.map(String) : [];

      if (targets.some((target) => target.includes("oabNumber") || target.includes("oabState"))) {
        return NextResponse.json(
          {
            success: false,
            code: "OAB_ALREADY_REGISTERED",
            message: "Esta OAB ja esta vinculada a outro cadastro.",
            traceId,
            stage,
          },
          { status: 409 }
        );
      }

      if (targets.some((target) => target.includes("email"))) {
        return NextResponse.json(
          {
            success: false,
            code: "EMAIL_ALREADY_REGISTERED",
            message: "Este email ja possui cadastro.",
            traceId,
            stage,
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          code: "DATABASE_CONSTRAINT_FAILED",
          message: "Conflito de dados ao concluir cadastro. Revise os dados e tente novamente.",
          traceId,
          stage,
        },
        { status: 409 }
      );
    }

    if (errorCode === "P2021" || errorCode === "P2022") {
      return NextResponse.json(
        {
          success: false,
          code: "DATABASE_SCHEMA_MISMATCH",
          message: "Estrutura do banco desatualizada para concluir o onboarding. Rode as migracoes pendentes.",
          traceId,
          stage,
        },
        { status: 500 }
      );
    }

    if (errorCode && errorCode.startsWith("P")) {
      return NextResponse.json(
        {
          success: false,
          code: "DATABASE_REQUEST_FAILED",
          message: "Falha ao salvar seus dados no banco. Tente novamente em instantes.",
          traceId,
          stage,
        },
        { status: 500 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        const targets = Array.isArray(error.meta?.target) ? error.meta.target.map(String) : [];

        if (targets.some((target) => target.includes("oabNumber") || target.includes("oabState"))) {
          return NextResponse.json(
            {
              success: false,
              code: "OAB_ALREADY_REGISTERED",
              message: "Esta OAB ja esta vinculada a outro cadastro.",
              traceId,
              stage,
            },
            { status: 409 }
          );
        }

        if (targets.some((target) => target.includes("email"))) {
          return NextResponse.json(
            {
              success: false,
              code: "EMAIL_ALREADY_REGISTERED",
              message: "Este email ja possui cadastro.",
              traceId,
              stage,
            },
            { status: 409 }
          );
        }

        return NextResponse.json(
          {
            success: false,
            code: "DATABASE_CONSTRAINT_FAILED",
            message: "Conflito de dados ao concluir cadastro. Revise os dados e tente novamente.",
            traceId,
            stage,
          },
          { status: 409 }
        );
      }

      if (error.code === "P2021" || error.code === "P2022") {
        return NextResponse.json(
          {
            success: false,
            code: "DATABASE_SCHEMA_MISMATCH",
            message: "Estrutura do banco desatualizada para concluir o onboarding. Rode as migracoes pendentes.",
            traceId,
            stage,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          code: "DATABASE_REQUEST_FAILED",
          message: "Falha ao salvar seus dados no banco. Tente novamente em instantes.",
          traceId,
          stage,
        },
        { status: 500 }
      );
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return NextResponse.json(
        {
          success: false,
          code: "DATABASE_UNKNOWN_ERROR",
          message: "Erro inesperado ao acessar o banco de dados. Tente novamente em instantes.",
          traceId,
          stage,
        },
        { status: 500 }
      );
    }

    if (error instanceof Prisma.PrismaClientRustPanicError) {
      return NextResponse.json(
        {
          success: false,
          code: "DATABASE_ENGINE_PANIC",
          message: "Falha critica no motor de banco de dados. Tente novamente e acione suporte se persistir.",
          traceId,
          stage,
        },
        { status: 500 }
      );
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return NextResponse.json(
        {
          success: false,
          code: "DATABASE_NOT_CONFIGURED",
          message: "Banco de dados indisponivel ou nao configurado. Tente novamente em instantes.",
          traceId,
          stage,
        },
        { status: 503 }
      );
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return NextResponse.json(
        {
          success: false,
          code: "DATABASE_VALIDATION_FAILED",
          message: "Dados invalidos para persistencia. Revise os campos e tente novamente.",
          traceId,
          stage,
        },
        { status: 400 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: "Payload invalido.",
          issues: error.issues,
          traceId,
          stage,
        },
        { status: 400 }
      );
    }

    if (errorName === "PrismaClientUnknownRequestError") {
      return NextResponse.json(
        {
          success: false,
          code: "DATABASE_UNKNOWN_ERROR",
          message: "Erro inesperado ao acessar o banco de dados. Tente novamente em instantes.",
          traceId,
          stage,
        },
        { status: 500 }
      );
    }

    if (errorName === "PrismaClientRustPanicError") {
      return NextResponse.json(
        {
          success: false,
          code: "DATABASE_ENGINE_PANIC",
          message: "Falha critica no motor de banco de dados. Tente novamente e acione suporte se persistir.",
          traceId,
          stage,
        },
        { status: 500 }
      );
    }

    if (errorName === "PrismaClientInitializationError") {
      return NextResponse.json(
        {
          success: false,
          code: "DATABASE_NOT_CONFIGURED",
          message: "Banco de dados indisponivel ou nao configurado. Tente novamente em instantes.",
          traceId,
          stage,
        },
        { status: 503 }
      );
    }

    if (errorName === "PrismaClientValidationError") {
      return NextResponse.json(
        {
          success: false,
          code: "DATABASE_VALIDATION_FAILED",
          message: "Dados invalidos para persistencia. Revise os campos e tente novamente.",
          traceId,
          stage,
        },
        { status: 400 }
      );
    }

    if (errorName === "AggregateError" && stage.startsWith("db:")) {
      return NextResponse.json(
        {
          success: false,
          code: "DATABASE_CONNECTION_FAILED",
          message: "Nao foi possivel conectar ao banco de dados para concluir o onboarding. Verifique o DATABASE_URL e a conectividade.",
          traceId,
          stage,
          ...(isDev ? { debug: { errorName, errorMessage, aggregateMessages } } : {}),
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        code: "ONBOARDING_COMPLETE_UNEXPECTED",
        message: "Nao foi possivel concluir onboarding. Tente novamente em alguns instantes.",
        traceId,
        stage,
        ...(isDev ? { debug: { errorName, errorMessage, aggregateMessages } } : {}),
      },
      { status: 500 }
    );
  }
}