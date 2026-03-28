import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getPaymentProvider } from "@/lib/payment";

const requestSchema = z
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
    officeLogoUrl: z.string().url().optional(),
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
    throw new Error("Supabase nao configurado para criar usuario de autenticacao.");
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

  throw error;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = requestSchema.parse(body);

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

    const authUserResult = await ensureSupabaseAuthUser({
      email: payload.email,
      password: payload.password,
      fullName: payload.fullName,
      role: payload.role,
    });

    const selectedPlan = payload.selectedPlan ?? "START";
    const needsPayment = payload.role === "LAWYER" && (selectedPlan === "PRO" || selectedPlan === "PREMIUM");
    let checkoutUrl: string | null = null;

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

        const provider = getPaymentProvider();
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
        const checkout = await provider.createCheckout({
          userId: user.id,
          planId: selectedPlan,
          successUrl: `${appUrl}/dashboard?checkout=success`,
          cancelUrl: `${appUrl}/onboarding?checkout=canceled`,
          customerEmail: user.email,
        });
        checkoutUrl = checkout.url;
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
      checkoutUrl,
      authUserCreated: authUserResult.created,
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