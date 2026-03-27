import { NextResponse } from "next/server";
import { requireAppUser, type AppPlan, type AppRole } from "@/lib/auth/requireAppUser";

export async function requirePlan(
  allowedPlans: AppPlan[],
  options?: {
    allowedRoles?: AppRole[];
    message?: string;
  }
) {
  const allowedRoles = options?.allowedRoles ?? ["LAWYER", "ADMIN"];
  const auth = await requireAppUser(allowedRoles);

  if (!auth.ok) {
    return auth;
  }

  if (auth.user.role === "ADMIN") {
    return auth;
  }

  if (!allowedPlans.includes(auth.user.plan)) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          code: "PLAN_REQUIRED",
          message:
            options?.message ??
            `Seu plano atual nao permite este recurso. Planos permitidos: ${allowedPlans.join(", ")}.`,
          currentPlan: auth.user.plan,
          allowedPlans,
        },
        { status: 403 }
      ),
    };
  }

  return auth;
}
