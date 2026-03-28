import { NextResponse } from "next/server";
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

function getUnlockMaxByPlan(plan: "START" | "PRO" | "PREMIUM", role: "CLIENT" | "LAWYER" | "ADMIN") {
  if (role === "ADMIN") {
    return Number.POSITIVE_INFINITY;
  }

  if (plan === "START") {
    const startLimit = Number(process.env.LEAD_UNLOCK_LIMIT_START ?? 8);
    return Number.isFinite(startLimit) ? Math.max(0, Math.floor(startLimit)) : 8;
  }

  if (plan === "PRO") {
    const proLimit = Number(process.env.LEAD_UNLOCK_LIMIT_PRO ?? Number.POSITIVE_INFINITY);
    return Number.isFinite(proLimit) ? Math.max(0, Math.floor(proLimit)) : Number.POSITIVE_INFINITY;
  }

  const premiumLimit = Number(process.env.LEAD_UNLOCK_LIMIT_PREMIUM ?? Number.POSITIVE_INFINITY);
  return Number.isFinite(premiumLimit) ? Math.max(0, Math.floor(premiumLimit)) : Number.POSITIVE_INFINITY;
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

    const unlockMax = getUnlockMaxByPlan(auth.user.plan, auth.user.role);
    const reopenHours = Number(process.env.LEAD_UNLOCK_REOPEN_HOURS ?? 48);

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        unlocks: {
          orderBy: {
            unlockedAt: "desc",
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ success: false, message: "Lead nao encontrado." }, { status: 404 });
    }

    const alreadyUnlocked = lead.unlocks.some((unlock) => unlock.userId === auth.user.id);
    if (alreadyUnlocked) {
      return NextResponse.json(
        {
          success: true,
          alreadyUnlocked: true,
          eligible: false,
          reason: "Lead ja desbloqueado por este escritorio.",
        },
        { status: 200 }
      );
    }

    const unlockCount = lead.unlocks.length;
    const lastUnlock = lead.unlocks[0];
    const lastUnlockAt = lastUnlock ? new Date(lastUnlock.unlockedAt).getTime() : null;
    const canReopenAfter48h =
      lead.status === "PENDING" &&
      lastUnlockAt !== null &&
      Date.now() - lastUnlockAt >= hoursToMilliseconds(reopenHours);

    const eligible = unlockCount < unlockMax || canReopenAfter48h;

    if (!eligible) {
      const maxLabel = Number.isFinite(unlockMax) ? String(unlockMax) : "ilimitado";
      return NextResponse.json(
        {
          success: false,
          eligible: false,
          reason: `Limite de ${maxLabel} desbloqueios atingido e janela adicional de ${reopenHours}h ainda indisponivel.`,
          unlockCount,
        },
        { status: 409 }
      );
    }

    if (dryRun) {
      return NextResponse.json({
        success: true,
        eligible: true,
        reason: canReopenAfter48h
          ? `Elegivel por reabertura apos ${reopenHours}h sem atendimento.`
          : "Elegivel dentro do limite de desbloqueios.",
        unlockCount,
      });
    }

    const unlock = await prisma.leadUnlock.create({
      data: {
        leadId,
        userId: auth.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      eligible: true,
      unlockId: unlock.id,
      unlockCountAfter: unlockCount + 1,
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
        { success: false, message: "Payload invalido.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Nao foi possivel processar desbloqueio do lead." },
      { status: 500 }
    );
  }
}