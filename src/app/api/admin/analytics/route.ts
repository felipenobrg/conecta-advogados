import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { planCatalog } from "@/lib/payment/plans";

const planPriceMap: Map<string, number> = new Map(
  planCatalog.map((entry) => [entry.id, entry.amountInCents])
);

function formatDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const trendStart = new Date(now);
  trendStart.setDate(trendStart.getDate() - 13);

  const [
    totalUsers,
    totalLawyers,
    totalClients,
    pendingLeads,
    unlocksToday,
    activeSubscriptions,
    subscriptions,
    planDistribution,
    statusDistribution,
    unlocksTrend,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "LAWYER" } }),
    prisma.user.count({ where: { role: "CLIENT" } }),
    prisma.lead.count({ where: { status: "PENDING" } }),
    prisma.leadUnlock.count({ where: { unlockedAt: { gte: todayStart } } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.findMany({
      select: {
        plan: true,
        status: true,
      },
    }),
    prisma.user.groupBy({
      by: ["plan"],
      _count: {
        _all: true,
      },
    }),
    prisma.subscription.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
    prisma.leadUnlock.findMany({
      where: {
        unlockedAt: {
          gte: trendStart,
        },
      },
      orderBy: {
        unlockedAt: "asc",
      },
      select: {
        unlockedAt: true,
      },
    }),
  ]);

  const estimatedMonthlyRevenueInCents = subscriptions.reduce((sum: number, row: { status: string; plan: string }) => {
    if (row.status !== "ACTIVE") return sum;
    return sum + (planPriceMap.get(row.plan) ?? 0);
  }, 0);

  const trendMap = new Map<string, number>();
  for (let index = 0; index < 14; index += 1) {
    const date = new Date(trendStart);
    date.setDate(trendStart.getDate() + index);
    trendMap.set(formatDay(date), 0);
  }

  for (const item of unlocksTrend) {
    const key = formatDay(item.unlockedAt);
    trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
  }

  return NextResponse.json({
    success: true,
    kpis: {
      revenueMonthlyEstimateInCents: estimatedMonthlyRevenueInCents,
      activeUsers: totalUsers,
      lawyers: totalLawyers,
      clients: totalClients,
      activeSubscriptions,
      pendingLeads,
      unlocksToday,
    },
    charts: {
      unlocksTrend: Array.from(trendMap.entries()).map(([date, unlocks]) => ({
        date,
        unlocks,
      })),
      planDistribution: planDistribution.map((row: { plan: string; _count: { _all: number } }) => ({
        plan: row.plan,
        users: row._count._all,
      })),
      subscriptionStatus: statusDistribution.map((row: { status: string; _count: { _all: number } }) => ({
        status: row.status,
        total: row._count._all,
      })),
    },
  });
}
