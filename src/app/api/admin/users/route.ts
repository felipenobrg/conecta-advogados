import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/requireAdmin";

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("q") ?? "").trim();
  const limitRaw = Number(searchParams.get("limit") ?? 40);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(Math.floor(limitRaw), 1), 100)
    : 40;

  const where = query
    ? {
        OR: [
          {
            name: {
              contains: query,
              mode: "insensitive" as const,
            },
          },
          {
            email: {
              contains: query,
              mode: "insensitive" as const,
            },
          },
        ],
      }
    : undefined;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        plan: true,
        whatsappVerified: true,
        createdAt: true,
        subscription: {
          select: {
            status: true,
            plan: true,
            provider: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            leads: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    admin: auth.adminUser,
    total,
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      plan: user.plan,
      subscriptionPlan: user.subscription?.plan ?? null,
      subscriptionStatus: user.subscription?.status ?? null,
      subscriptionProvider: user.subscription?.provider ?? null,
      whatsappVerified: user.whatsappVerified,
      unlockCount: user._count.leads,
      createdAt: user.createdAt,
    })),
  });
}
