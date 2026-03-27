import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const requestSchema = z.object({
  sessionId: z.string().min(10),
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  phoneVerified: z.boolean(),
  consentAccepted: z.boolean(),
  role: z.enum(["LAWYER", "CLIENT"]),
  selectedPlan: z.enum(["START", "PRO", "PRIMUM"]).optional(),
  practiceAreas: z.array(z.string()).default([]),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = requestSchema.parse(body);

    if (!payload.phoneVerified) {
      return NextResponse.json(
        { success: false, message: "WhatsApp precisa estar validado para concluir cadastro." },
        { status: 400 }
      );
    }

    if (!payload.consentAccepted) {
      return NextResponse.json(
        { success: false, message: "Consentimento LGPD obrigatorio." },
        { status: 400 }
      );
    }

    if (payload.role === "LAWYER" && !payload.selectedPlan) {
      return NextResponse.json(
        { success: false, message: "Advogado precisa selecionar um plano." },
        { status: 400 }
      );
    }

    const selectedPlan = payload.selectedPlan ?? "START";
    const needsPayment = payload.role === "LAWYER" && (selectedPlan === "PRO" || selectedPlan === "PRIMUM");

    const user = await prisma.user.upsert({
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
      if (needsPayment) {
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
      } else {
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
      sessionId: payload.sessionId,
      practiceAreasCount: payload.practiceAreas.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Payload invalido.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Nao foi possivel concluir onboarding." },
      { status: 500 }
    );
  }
}