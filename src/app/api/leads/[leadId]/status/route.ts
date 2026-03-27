import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAppUser } from "@/lib/auth/requireAppUser";

const requestSchema = z.object({
  status: z.enum(["PENDING", "CONTACTED", "CONVERTED", "LOST"]),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ leadId: string }> }
) {
  try {
    const auth = await requireAppUser(["LAWYER", "ADMIN"]);
    if (!auth.ok) {
      return auth.response;
    }

    const { leadId } = await context.params;
    const body = await request.json();
    const payload = requestSchema.parse(body);

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        status: true,
        unlocks: {
          where: { userId: auth.user.id },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, message: "Lead nao encontrado." },
        { status: 404 }
      );
    }

    if (auth.user.role !== "ADMIN" && lead.unlocks.length === 0) {
      return NextResponse.json(
        { success: false, message: "Voce nao pode atualizar este lead." },
        { status: 403 }
      );
    }

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: payload.status,
        statusUpdatedAt: new Date(),
        statusUpdatedBy: auth.user.role,
      },
      select: {
        id: true,
        status: true,
        statusUpdatedAt: true,
        statusUpdatedBy: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Status atualizado com sucesso.",
      lead: updated,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Payload invalido.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Nao foi possivel atualizar o status do lead." },
      { status: 500 }
    );
  }
}
