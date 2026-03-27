import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const requestSchema = z.object({
  leadId: z.string().uuid(),
  userId: z.string().uuid(),
  dryRun: z.boolean().default(false),
});

function hoursToMilliseconds(hours: number) {
  return hours * 60 * 60 * 1000;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { leadId, userId, dryRun } = requestSchema.parse(body);

    const unlockMax = Number(process.env.LEAD_UNLOCK_MAX ?? 3);
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

    const alreadyUnlocked = lead.unlocks.some((unlock) => unlock.userId === userId);
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
      return NextResponse.json(
        {
          success: false,
          eligible: false,
          reason: `Limite de ${unlockMax} desbloqueios atingido e janela adicional de ${reopenHours}h ainda indisponivel.`,
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
        userId,
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