import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppRole = "CLIENT" | "LAWYER" | "ADMIN";
export type AppPlan = "START" | "PRO" | "PREMIUM";
export type AppSubStatus = "ACTIVE" | "CANCELED" | "PAST_DUE";

export type RequireAppUserResult =
  | {
      ok: true;
      user: {
        id: string;
        email: string;
        name: string;
        role: AppRole;
        plan: AppPlan;
        subscription: {
          status: AppSubStatus;
          plan: AppPlan;
        } | null;
      };
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function requireAppUser(allowedRoles?: AppRole[]): Promise<RequireAppUserResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user?.email) {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, message: "Sessao invalida." },
          { status: 401 }
        ),
      };
    }

    const appUser = await prisma.user.findUnique({
      where: { email: data.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        subscription: {
          select: {
            status: true,
            plan: true,
          },
        },
      },
    });

    if (!appUser) {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, message: "Usuario nao encontrado na base de aplicacao." },
          { status: 404 }
        ),
      };
    }

    if (allowedRoles && !allowedRoles.includes(appUser.role)) {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, message: "Acesso negado para este recurso." },
          { status: 403 }
        ),
      };
    }

    return {
      ok: true,
      user: {
        id: appUser.id,
        email: appUser.email,
        name: appUser.name,
        role: appUser.role,
        plan: appUser.plan,
        subscription: appUser.subscription,
      },
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2023") {
      return {
        ok: false,
        response: NextResponse.json(
          {
            success: false,
            code: "DATA_MIGRATION_REQUIRED",
            message:
              "Encontramos um dado legado de plano. Rode a migracao PRIMUM -> PREMIUM no banco e tente novamente.",
          },
          { status: 503 }
        ),
      };
    }

    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: "Falha ao validar sessao." },
        { status: 500 }
      ),
    };
  }
}
