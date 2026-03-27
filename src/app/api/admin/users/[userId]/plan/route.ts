import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";

const payloadSchema = z.object({
  plan: z.enum(["START", "PRO", "PRIMUM"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { userId } = await context.params;
    const body = await request.json();
    const payload = payloadSchema.parse(body);

    const result = await prisma.$transaction(async (transaction) => {
      const existing = await transaction.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          plan: true,
          subscription: {
            select: {
              provider: true,
              providerId: true,
              status: true,
            },
          },
        },
      });

      if (!existing) {
        throw new Error("USER_NOT_FOUND");
      }

      const user = await transaction.user.update({
        where: { id: userId },
        data: {
          plan: payload.plan,
          planExpiresAt: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          plan: true,
        },
      });

      const subscription = await transaction.subscription.upsert({
        where: { userId },
        update: {
          plan: payload.plan,
          status: existing.subscription?.status ?? "ACTIVE",
        },
        create: {
          userId,
          provider: existing.subscription?.provider ?? "internal",
          providerId: existing.subscription?.providerId ?? `internal-${userId}`,
          status: existing.subscription?.status ?? "ACTIVE",
          plan: payload.plan,
        },
        select: {
          id: true,
          provider: true,
          providerId: true,
          status: true,
          plan: true,
        },
      });

      return {
        user,
        subscription,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Plano atualizado com sucesso.",
      updatedByAdminId: auth.adminUser.id,
      user: result.user,
      subscription: result.subscription,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Payload invalido.", issues: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json(
        { success: false, message: "Usuario nao encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Nao foi possivel atualizar plano." },
      { status: 500 }
    );
  }
}
