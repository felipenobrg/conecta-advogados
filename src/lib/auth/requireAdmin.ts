import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminAuthResult =
  | {
      ok: true;
      adminUser: {
        id: string;
        email: string;
        name: string;
      };
    }
  | {
      ok: false;
      response: NextResponse;
    };

export async function requireAdmin(): Promise<AdminAuthResult> {
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

    const adminUser = await prisma.user.findUnique({
      where: { email: data.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return {
        ok: false,
        response: NextResponse.json(
          { success: false, message: "Acesso restrito ao admin." },
          { status: 403 }
        ),
      };
    }

    return {
      ok: true,
      adminUser: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
      },
    };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, message: "Falha ao validar sessao admin." },
        { status: 500 }
      ),
    };
  }
}
