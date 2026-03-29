import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const maxAttemptsPerIpWindow = 5;
const maxAttemptsPerEmailWindow = 5;
const windowMs = 15 * 60 * 1000;
const dedupeWindowMs = 24 * 60 * 60 * 1000;

const ipAttempts = new Map<string, number[]>();
const emailAttempts = new Map<string, number[]>();

const allowedPracticeAreas = new Set([
  "Direito Civil",
  "Trabalhista",
  "Criminal",
  "Familia",
  "Tributario",
  "Previdenciario",
  "Empresarial",
]);

const allowedUrgencyLevels = new Set(["LOW", "MEDIUM", "HIGH", "URGENT"]);
const allowedGenderOptions = new Set(["F", "M", "O", "N"]);

const brazilStates = new Set([
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA",
  "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO",
]);

function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function hasAtLeastTwoWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length >= 2;
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  return realIp?.trim() || "unknown";
}

function pruneAndCount(map: Map<string, number[]>, key: string, now: number) {
  const current = map.get(key) ?? [];
  const pruned = current.filter((timestamp) => now - timestamp <= windowMs);
  map.set(key, pruned);
  return pruned.length;
}

function registerAttempt(map: Map<string, number[]>, key: string, now: number) {
  const current = map.get(key) ?? [];
  map.set(key, [...current, now]);
}

function isPrismaClientValidationUnknownLeadField(error: unknown) {
  if (!(error instanceof Error)) return false;
  if (error.name !== "PrismaClientValidationError") return false;
  return /Unknown argument `(city|neighborhood|problemDescription|urgency|gender)`/i.test(error.message);
}

function isPrismaSchemaMismatchKnownError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2021" || error.code === "P2022");
}

const requestSchema = z
  .object({
    name: z
      .string()
      .transform((value) => normalizeText(value))
      .pipe(z.string().min(2, "Informe seu nome completo.").max(120)),
    email: z
      .string()
      .transform((value) => normalizeEmail(value))
      .pipe(z.string().email("Email invalido. Use o formato nome@dominio.com.")),
    phone: z
      .string()
      .transform((value) => normalizePhoneDigits(value))
      .refine((value) => value.length >= 10 && value.length <= 11, {
        message: "WhatsApp invalido. Use DDD + numero.",
      }),
    area: z.string().transform((value) => normalizeText(value)),
    state: z.string().transform((value) => value.trim().toUpperCase()),
    city: z
      .string()
      .transform((value) => normalizeText(value))
      .pipe(z.string().min(2, "Informe uma cidade valida.").max(60, "Cidade muito longa.")),
    neighborhood: z
      .string()
      .transform((value) => normalizeText(value))
      .pipe(z.string().min(2, "Informe um bairro valido.").max(60, "Bairro muito longo.")),
    problemDescription: z
      .string()
      .transform((value) => normalizeText(value))
      .pipe(z.string().min(20, "Descreva melhor seu problema.").max(700, "Descricao do problema muito longa.")),
    urgency: z.string().transform((value) => value.trim().toUpperCase()),
    gender: z.string().transform((value) => value.trim().toUpperCase()),
    consentAccepted: z.boolean(),
  })
  .strict()
  .superRefine((payload, ctx) => {
    if (!hasAtLeastTwoWords(payload.name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: "Informe nome e sobrenome.",
      });
    }

    if (!allowedPracticeAreas.has(payload.area)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["area"],
        message: "Selecione uma area juridica valida.",
      });
    }

    if (!brazilStates.has(payload.state)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["state"],
        message: "UF invalida. Use duas letras, ex: SP.",
      });
    }

    if (!allowedUrgencyLevels.has(payload.urgency)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["urgency"],
        message: "Selecione um nivel de urgencia valido.",
      });
    }

    if (!allowedGenderOptions.has(payload.gender)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["gender"],
        message: "Selecione uma opcao de genero valida.",
      });
    }

    if (!payload.consentAccepted) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["consentAccepted"],
        message: "Voce precisa aceitar os termos LGPD para enviar sua inscricao.",
      });
    }
  });

export async function POST(request: Request) {
  const traceId = globalThis.crypto?.randomUUID?.() ?? `lead-${Date.now()}`;
  const now = Date.now();
  const ip = getClientIp(request);

  try {
    const body = await request.json();
    const payload = requestSchema.parse(body);

    if (pruneAndCount(ipAttempts, ip, now) >= maxAttemptsPerIpWindow) {
      return NextResponse.json(
        {
          success: false,
          code: "LEAD_RATE_LIMIT_IP",
          message: "Muitas tentativas deste dispositivo. Aguarde alguns minutos e tente novamente.",
          traceId,
        },
        { status: 429 }
      );
    }

    if (pruneAndCount(emailAttempts, payload.email, now) >= maxAttemptsPerEmailWindow) {
      return NextResponse.json(
        {
          success: false,
          code: "LEAD_RATE_LIMIT_EMAIL",
          message: "Muitas tentativas para este email. Aguarde alguns minutos e tente novamente.",
          traceId,
        },
        { status: 429 }
      );
    }

    let duplicateLead: { id: string } | null = null;
    let usedLegacyPrismaFallback = false;

    try {
      duplicateLead = await prisma.lead.findFirst({
        where: {
          email: payload.email,
          phone: payload.phone,
          area: payload.area,
          state: payload.state,
          city: payload.city,
          neighborhood: payload.neighborhood,
          createdAt: {
            gte: new Date(now - dedupeWindowMs),
          },
        },
        select: { id: true },
      });
    } catch (error) {
      if (!isPrismaClientValidationUnknownLeadField(error) && !isPrismaSchemaMismatchKnownError(error)) {
        throw error;
      }

      usedLegacyPrismaFallback = true;
      try {
        duplicateLead = await prisma.lead.findFirst({
          where: {
            email: payload.email,
            phone: payload.phone,
            area: payload.area,
            state: payload.state,
            createdAt: {
              gte: new Date(now - dedupeWindowMs),
            },
          },
          select: { id: true },
        });
      } catch {
        const legacyRows = await prisma.$queryRaw<Array<{ id: string }>>(
          Prisma.sql`
            select "id"
            from public."Lead"
            where "email" = ${payload.email}
              and "phone" = ${payload.phone}
              and "area" = ${payload.area}
              and "state" = ${payload.state}
              and "createdAt" >= ${new Date(now - dedupeWindowMs)}
            limit 1
          `
        );
        duplicateLead = legacyRows[0] ?? null;
      }
    }

    if (duplicateLead) {
      return NextResponse.json(
        {
          success: false,
          code: "LEAD_DUPLICATE_RECENT",
          message: "Voce ja enviou uma inscricao recente. Em breve um advogado entrara em contato.",
          traceId,
        },
        { status: 409 }
      );
    }

    let lead: { id: string; createdAt: Date };

    try {
      lead = await prisma.lead.create({
        data: {
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          area: payload.area,
          state: payload.state,
          city: payload.city,
          neighborhood: payload.neighborhood,
          problemDescription: payload.problemDescription,
          urgency: payload.urgency,
          gender: payload.gender,
          whatsappVerified: false,
        },
        select: {
          id: true,
          createdAt: true,
        },
      });
    } catch (error) {
      if (!isPrismaClientValidationUnknownLeadField(error) && !isPrismaSchemaMismatchKnownError(error)) {
        throw error;
      }

      usedLegacyPrismaFallback = true;
      try {
        lead = await prisma.lead.create({
          data: {
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            area: payload.area,
            state: payload.state,
            whatsappVerified: false,
          },
          select: {
            id: true,
            createdAt: true,
          },
        });
      } catch {
        const legacyInsert = await prisma.$queryRaw<Array<{ id: string; createdAt: Date }>>(
          Prisma.sql`
            insert into public."Lead"
              ("id", "name", "email", "phone", "whatsappVerified", "area", "state", "status", "createdAt")
            values
              (${globalThis.crypto?.randomUUID?.() ?? `lead-${Date.now()}`}, ${payload.name}, ${payload.email}, ${payload.phone}, ${false}, ${payload.area}, ${payload.state}, ${"PENDING"}, ${new Date()})
            returning "id", "createdAt"
          `
        );

        lead = legacyInsert[0];
      }
    }

    registerAttempt(ipAttempts, ip, now);
    registerAttempt(emailAttempts, payload.email, now);

    return NextResponse.json(
      {
        success: true,
        message:
          usedLegacyPrismaFallback
            ? "Inscricao recebida com sucesso. Seu contato foi salvo e nossa equipe finalizara a sincronizacao dos detalhes em instantes."
            : "Inscricao recebida com sucesso. Em breve um advogado da nossa rede entrara em contato.",
        lead,
        traceId,
      },
      { status: 201 }
    );
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode =
      error && typeof error === "object" && "code" in error && typeof (error as { code: unknown }).code === "string"
        ? (error as { code: string }).code
        : undefined;

    console.error("[public.leads.submit] fail", {
      traceId,
      errorName,
      errorMessage,
      errorCode,
      ...(error instanceof Prisma.PrismaClientKnownRequestError
        ? { prismaMeta: error.meta }
        : {}),
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: "Revise os dados informados para continuar.",
          issues: error.issues,
          traceId,
        },
        { status: 400 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2021" || error.code === "P2022") {
        return NextResponse.json(
          {
            success: false,
            code: "DATABASE_SCHEMA_MISMATCH",
            message: "Estrutura do banco desatualizada para receber leads. Rode o SQL de ajuste do schema.",
            traceId,
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          code: "DATABASE_REQUEST_FAILED",
          message: "Falha ao salvar sua inscricao no banco. Tente novamente em instantes.",
          traceId,
        },
        { status: 500 }
      );
    }

    if (isPrismaClientValidationUnknownLeadField(error)) {
      return NextResponse.json(
        {
          success: false,
          code: "DATABASE_CLIENT_OUTDATED",
          message: "Estamos finalizando uma atualizacao do sistema. Tente novamente em alguns segundos.",
          traceId,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        code: "LEAD_SUBMIT_UNEXPECTED",
        message: "Nao foi possivel enviar sua inscricao agora. Tente novamente em instantes.",
        traceId,
        ...(process.env.NODE_ENV !== "production" ? { debug: { errorName, errorMessage, errorCode } } : {}),
      },
      { status: 500 }
    );
  }
}