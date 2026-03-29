import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAppUser } from "@/lib/auth/requireAppUser";
import { requireLawyerPayment } from "@/lib/auth/requireLawyerPayment";

const requestSchema = z.object({
  leadId: z.string().uuid(),
  dryRun: z.boolean().default(false),
});

function hoursToMilliseconds(hours: number) {
  return hours * 60 * 60 * 1000;
}

function getUserUnlockQuotaByPlan(plan: "START" | "PRO" | "PREMIUM", role: "CLIENT" | "LAWYER" | "ADMIN") {
  if (role === "ADMIN") {
    return Number.POSITIVE_INFINITY;
  }

  if (plan === "START") {
    const startLimit = Number(process.env.LEAD_UNLOCK_LIMIT_START ?? 8);
    return Number.isFinite(startLimit) ? Math.max(0, Math.floor(startLimit)) : 8;
  }

  if (plan === "PRO") {
    const proLimit = Number(process.env.LEAD_UNLOCK_LIMIT_PRO ?? 30);
    return Number.isFinite(proLimit) ? Math.max(0, Math.floor(proLimit)) : Number.POSITIVE_INFINITY;
  }

  const premiumLimit = Number(process.env.LEAD_UNLOCK_LIMIT_PREMIUM ?? 75);
  return Number.isFinite(premiumLimit) ? Math.max(0, Math.floor(premiumLimit)) : Number.POSITIVE_INFINITY;
}

function getLeadOfficeCap() {
  const defaultCap = 3;
  const cap = Number(process.env.LEAD_UNLOCK_MAX_PER_LEAD ?? defaultCap);
  return Number.isFinite(cap) ? Math.max(1, Math.floor(cap)) : defaultCap;
}

function mapPrismaError(error: Prisma.PrismaClientKnownRequestError) {
  if (error.code === "P2022") {
    return NextResponse.json(
      {
        success: false,
        code: "SCHEMA_MISMATCH",
        message:
          "Seu banco está com schema desatualizado para este recurso de desbloqueio. Rode as migrations e tente novamente.",
      },
      { status: 503 }
    );
  }

  if (error.code === "P2023") {
    return NextResponse.json(
      {
        success: false,
        code: "DATA_MIGRATION_REQUIRED",
        message: "Encontramos dados legados incompatíveis. Execute a migração de dados e tente novamente.",
      },
      { status: 503 }
    );
  }

  if (error.code === "P2003") {
    return NextResponse.json(
      {
        success: false,
        code: "RELATION_CONSTRAINT",
        message: "Não foi possível desbloquear por referência inválida de usuário ou lead.",
      },
      { status: 409 }
    );
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const auth = await requireAppUser(["LAWYER", "ADMIN"]);
    if (!auth.ok) {
      return auth.response;
    }

    const paymentGate = requireLawyerPayment(auth.user);
    if (paymentGate) {
      return paymentGate;
    }

    const body = await request.json();
    const { leadId, dryRun } = requestSchema.parse(body);

    const userUnlockQuota = getUserUnlockQuotaByPlan(auth.user.plan, auth.user.role);
    const leadOfficeCap = getLeadOfficeCap();
    const reopenHours = Number(process.env.LEAD_UNLOCK_REOPEN_HOURS ?? 48);

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ success: false, message: "Lead não encontrado." }, { status: 404 });
    }

    const [existingUserUnlock, unlockCount, userUnlockCount, lastUnlock] = await Promise.all([
      prisma.leadUnlock.findFirst({
        where: {
          leadId,
          userId: auth.user.id,
        },
        select: {
          id: true,
        },
      }),
      prisma.leadUnlock.count({
        where: {
          leadId,
        },
      }),
      prisma.leadUnlock.count({
        where: {
          userId: auth.user.id,
        },
      }),
      prisma.leadUnlock.findFirst({
        where: {
          leadId,
        },
        orderBy: {
          unlockedAt: "desc",
        },
        select: {
          unlockedAt: true,
        },
      }),
    ]);

    const alreadyUnlocked = Boolean(existingUserUnlock);
    if (alreadyUnlocked) {
      return NextResponse.json(
        {
          success: true,
          alreadyUnlocked: true,
          eligible: false,
          reason: "Lead já desbloqueado por este escritório.",
        },
        { status: 200 }
      );
    }

    const lastUnlockAt = lastUnlock ? new Date(lastUnlock.unlockedAt).getTime() : null;
    const canReopenAfter48h =
      lead.status === "PENDING" &&
      lastUnlockAt !== null &&
      Date.now() - lastUnlockAt >= hoursToMilliseconds(reopenHours);

    const withinUserQuota = userUnlockCount < userUnlockQuota;
    const withinLeadCap = unlockCount < leadOfficeCap || canReopenAfter48h;
    const eligible = withinUserQuota && withinLeadCap;

    if (!eligible) {
      const maxLabel = Number.isFinite(userUnlockQuota) ? String(userUnlockQuota) : "ilimitado";
      const reason = !withinUserQuota
        ? `Limite do seu plano atingido (${maxLabel} desbloqueios).`
        : `Este lead atingiu o limite de ${leadOfficeCap} escritórios e a janela adicional de ${reopenHours}h ainda está indisponível.`;

      return NextResponse.json(
        {
          success: false,
          eligible: false,
          reason,
          unlockCount,
          userUnlockCount,
        },
        { status: 409 }
      );
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        eligible: true,
        reason: canReopenAfter48h
          ? `Elegível por reabertura após ${reopenHours}h sem atendimento.`
          : "Elegível dentro do limite do seu plano.",
        unlockCount,
        userUnlockCount,
      });
    }

    let unlock: { id: string };
    try {
      unlock = await prisma.leadUnlock.create({
        data: {
          leadId,
          userId: auth.user.id,
        },
        select: {
          id: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002") {
          return NextResponse.json(
            {
              success: true,
              alreadyUnlocked: true,
              eligible: false,
              reason: "Lead já desbloqueado por este escritório.",
            },
            { status: 200 }
          );
        }

        const mapped = mapPrismaError(error);
        if (mapped) {
          return mapped;
        }
      }

      throw error;
    }

    return NextResponse.json({
      success: true,
      eligible: true,
      unlockId: unlock.id,
      unlockCountAfter: unlockCount + 1,
      userUnlockCountAfter: userUnlockCount + 1,
      reason: canReopenAfter48h
        ? `Desbloqueio liberado por regra de ${reopenHours}h sem atendimento.`
        : "Desbloqueio realizado dentro do limite do plano.",
      unlockedBy: {
        userId: auth.user.id,
        role: auth.user.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Payload inválido.", issues: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, message: "JSON inválido no corpo da requisição de desbloqueio." },
        { status: 400 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = mapPrismaError(error);
      if (mapped) {
        return mapped;
      }
    }

    console.error("[POST /api/leads/unlock] failed", error);

    return NextResponse.json(
      { success: false, message: "Não foi possível processar desbloqueio do lead." },
      { status: 500 }
    );
  }
}