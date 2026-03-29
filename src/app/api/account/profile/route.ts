import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAppUser } from "@/lib/auth/requireAppUser";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto.").max(120, "Nome muito longo."),
  email: z.string().trim().toLowerCase().email("Email invalido."),
  phone: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .refine((value) => value.length >= 10 && value.length <= 11, {
      message: "WhatsApp invalido. Use DDD + numero.",
    }),
  officeName: z.string().trim().min(2).max(120).optional(),
  officeLogoUrl: z
    .string()
    .trim()
    .url("URL da logo invalida.")
    .optional()
    .or(z.literal("")),
  oabNumber: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .pipe(z.string().min(4, "Numero OAB invalido.").max(12, "Numero OAB invalido."))
    .optional(),
  oabState: z.string().trim().toUpperCase().length(2, "UF da OAB invalida.").optional(),
});

export async function GET() {
  const auth = await requireAppUser(["LAWYER", "ADMIN"]);
  if (!auth.ok) return auth.response;

  const profile = await prisma.user.findUnique({
    where: { id: auth.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      plan: true,
      lawyerProfile: {
        select: {
          officeName: true,
          officeLogoUrl: true,
          oabNumber: true,
          oabState: true,
        },
      },
    },
  });

  if (!profile) {
    return NextResponse.json({ success: false, message: "Usuario nao encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      role: profile.role,
      plan: profile.plan,
      officeName: profile.lawyerProfile?.officeName ?? "",
      officeLogoUrl: profile.lawyerProfile?.officeLogoUrl ?? "",
      oabNumber: profile.lawyerProfile?.oabNumber ?? "",
      oabState: profile.lawyerProfile?.oabState ?? "",
    },
  });
}

export async function PUT(request: Request) {
  const auth = await requireAppUser(["LAWYER", "ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const parsed = updateProfileSchema.parse(body);

    if (auth.user.role === "LAWYER") {
      if (!parsed.oabNumber || !parsed.oabState || !parsed.officeName) {
        return NextResponse.json(
          {
            success: false,
            code: "LAWYER_PROFILE_REQUIRED",
            message: "Para advogado, informe nome do escritorio, numero da OAB e UF da OAB.",
          },
          { status: 400 }
        );
      }

      const existingLawyerProfile = await prisma.lawyerProfile.findUnique({
        where: { userId: auth.user.id },
        select: { id: true },
      });

      if (!existingLawyerProfile) {
        return NextResponse.json(
          {
            success: false,
            code: "LAWYER_PROFILE_NOT_FOUND",
            message: "Perfil profissional nao encontrado. Refaça o onboarding do advogado.",
          },
          { status: 404 }
        );
      }
    }

    const current = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: { email: true },
    });

    if (!current) {
      return NextResponse.json({ success: false, message: "Usuario nao encontrado." }, { status: 404 });
    }

    if (parsed.email !== current.email) {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.updateUser({ email: parsed.email });
      if (error) {
        return NextResponse.json(
          {
            success: false,
            code: "AUTH_EMAIL_UPDATE_FAILED",
            message: "Nao foi possivel atualizar seu email de acesso no momento.",
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: auth.user.id },
        data: {
          name: parsed.name,
          email: parsed.email,
          phone: parsed.phone,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          plan: true,
        },
      });

      let lawyerProfile: {
        officeName: string;
        officeLogoUrl: string | null;
        oabNumber: string;
        oabState: string;
      } | null = null;

      if (auth.user.role === "LAWYER") {
        lawyerProfile = await tx.lawyerProfile.update({
          where: { userId: auth.user.id },
          data: {
            officeName: parsed.officeName!,
            officeLogoUrl: parsed.officeLogoUrl || null,
            oabNumber: parsed.oabNumber!,
            oabState: parsed.oabState!,
          },
          select: {
            officeName: true,
            officeLogoUrl: true,
            oabNumber: true,
            oabState: true,
          },
        });
      }

      return { user, lawyerProfile };
    });

    return NextResponse.json({
      success: true,
      message: "Perfil atualizado com sucesso.",
      profile: {
        id: updated.user.id,
        name: updated.user.name,
        email: updated.user.email,
        phone: updated.user.phone,
        role: updated.user.role,
        plan: updated.user.plan,
        officeName: updated.lawyerProfile?.officeName ?? "",
        officeLogoUrl: updated.lawyerProfile?.officeLogoUrl ?? "",
        oabNumber: updated.lawyerProfile?.oabNumber ?? "",
        oabState: updated.lawyerProfile?.oabState ?? "",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: "Revise os campos informados.",
          issues: error.issues,
        },
        { status: 400 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        {
          success: false,
          code: "DUPLICATE_DATA",
          message: "Ja existe cadastro com este email ou OAB.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        code: "PROFILE_UPDATE_FAILED",
        message: "Nao foi possivel atualizar seu perfil agora. Tente novamente em instantes.",
      },
      { status: 500 }
    );
  }
}
