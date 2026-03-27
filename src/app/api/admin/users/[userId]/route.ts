import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { planCatalog } from "@/lib/payment/plans";

const planPriceMap = new Map(planCatalog.map((entry) => [entry.id, entry.amountInCents]));

function toFinancialHistory(input: {
  status: string;
  plan: "START" | "PRO" | "PRIMUM";
  provider: string;
  createdAt: Date;
}) {
  const amountInCents = planPriceMap.get(input.plan) ?? 0;

  return [
    {
      type: "subscription_created",
      status: input.status,
      provider: input.provider,
      plan: input.plan,
      amountInCents,
      date: input.createdAt,
      note: "Assinatura registrada no sistema.",
    },
    {
      type: "latest_status",
      status: input.status,
      provider: input.provider,
      plan: input.plan,
      amountInCents,
      date: new Date(),
      note:
        input.status === "ACTIVE"
          ? "Assinatura ativa e apta para acesso ao plano."
          : "Assinatura com restricao operacional.",
    },
  ];
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const { userId } = await context.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      plan: true,
      whatsappVerified: true,
      createdAt: true,
      planExpiresAt: true,
      subscription: {
        select: {
          id: true,
          provider: true,
          providerId: true,
          status: true,
          plan: true,
          createdAt: true,
        },
      },
      leads: {
        orderBy: {
          unlockedAt: "desc",
        },
        take: 12,
        select: {
          id: true,
          unlockedAt: true,
          lead: {
            select: {
              id: true,
              name: true,
              area: true,
              status: true,
              createdAt: true,
            },
          },
        },
      },
      _count: {
        select: {
          leads: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json(
      { success: false, message: "Usuario nao encontrado." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      plan: user.plan,
      planExpiresAt: user.planExpiresAt,
      whatsappVerified: user.whatsappVerified,
      createdAt: user.createdAt,
      subscription: user.subscription,
      leadMetrics: {
        totalUnlocks: user._count.leads,
      },
      leadHistory: user.leads.map((entry) => ({
        unlockId: entry.id,
        unlockedAt: entry.unlockedAt,
        leadId: entry.lead.id,
        leadName: entry.lead.name,
        area: entry.lead.area,
        status: entry.lead.status,
        leadCreatedAt: entry.lead.createdAt,
      })),
      financialHistory: user.subscription
        ? toFinancialHistory({
            status: user.subscription.status,
            plan: user.subscription.plan,
            provider: user.subscription.provider,
            createdAt: user.subscription.createdAt,
          })
        : [],
    },
  });
}
