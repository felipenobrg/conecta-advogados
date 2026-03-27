import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAppUser } from "@/lib/auth/requireAppUser";

export async function GET() {
  const auth = await requireAppUser(["LAWYER", "ADMIN"]);
  if (!auth.ok) {
    return auth.response;
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: auth.user.id },
    select: {
      id: true,
      provider: true,
      providerId: true,
      status: true,
      plan: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    success: true,
    user: {
      id: auth.user.id,
      role: auth.user.role,
      plan: auth.user.plan,
    },
    subscription,
    isActive: subscription?.status === "ACTIVE",
  });
}
