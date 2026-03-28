import { NextResponse } from "next/server";
import type { AppPlan, AppRole, AppSubStatus } from "@/lib/auth/requireAppUser";

type AppUserForPayment = {
  role: AppRole;
  subscription: {
    status: AppSubStatus;
    plan: AppPlan;
  } | null;
};

export function requireLawyerPayment(user: AppUserForPayment) {
  if (user.role !== "LAWYER") {
    return null;
  }

  const subscription = user.subscription;
  if (!subscription) {
    return null;
  }

  const selectedPaidPlan = subscription.plan === "PRO" || subscription.plan === "PREMIUM";
  const isPendingPayment = selectedPaidPlan && subscription.status !== "ACTIVE";

  if (!isPendingPayment) {
    return null;
  }

  return NextResponse.json(
    {
      success: false,
      code: "PAYMENT_REQUIRED",
      message: "Finalize o pagamento do plano para liberar o acesso completo.",
      subscription,
    },
    { status: 402 }
  );
}
