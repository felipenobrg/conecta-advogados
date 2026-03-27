import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(date)
    .replace(".", "")
    .replace(/^[a-z]/, (char) => char.toUpperCase());
}

function normalizeDateRange(from: string | null, to: string | null) {
  const end = to ? new Date(to) : new Date();
  const start = from ? new Date(from) : new Date(new Date().setDate(new Date().getDate() - 30));

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("INVALID_DATE");
  }

  return {
    start,
    end,
  };
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user?.email) {
      return NextResponse.json(
        { success: false, message: "Sessao invalida." },
        { status: 401 }
      );
    }

    const appUser = await prisma.user.findUnique({
      where: { email: data.user.email },
      select: {
        id: true,
        role: true,
      },
    });

    if (!appUser || (appUser.role !== "LAWYER" && appUser.role !== "ADMIN")) {
      return NextResponse.json(
        { success: false, message: "Acesso restrito ao dashboard." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const { start, end } = normalizeDateRange(
      searchParams.get("from"),
      searchParams.get("to")
    );

    const [
      totalUnlocks,
      filteredUnlocks,
      convertedUnlocks,
      recentUnlocks,
      allUnlocksForMonths,
    ] = await Promise.all([
      prisma.leadUnlock.count({
        where: {
          userId: appUser.id,
        },
      }),
      prisma.leadUnlock.count({
        where: {
          userId: appUser.id,
          unlockedAt: {
            gte: start,
            lte: end,
          },
        },
      }),
      prisma.leadUnlock.count({
        where: {
          userId: appUser.id,
          unlockedAt: {
            gte: start,
            lte: end,
          },
          lead: {
            status: "CONVERTED",
          },
        },
      }),
      prisma.leadUnlock.findMany({
        where: {
          userId: appUser.id,
          unlockedAt: {
            gte: start,
            lte: end,
          },
        },
        orderBy: {
          unlockedAt: "desc",
        },
        take: 20,
        select: {
          id: true,
          unlockedAt: true,
          lead: {
            select: {
              name: true,
              area: true,
              status: true,
            },
          },
        },
      }),
      prisma.leadUnlock.findMany({
        where: {
          userId: appUser.id,
        },
        orderBy: {
          unlockedAt: "asc",
        },
        select: {
          unlockedAt: true,
        },
      }),
    ]);

    const conversionRate = filteredUnlocks > 0 ? (convertedUnlocks / filteredUnlocks) * 100 : 0;

    const monthBuckets = new Map<string, number>();
    const baseMonth = new Date();
    baseMonth.setDate(1);

    for (let index = 5; index >= 0; index -= 1) {
      const monthDate = new Date(baseMonth.getFullYear(), baseMonth.getMonth() - index, 1);
      const key = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
      monthBuckets.set(key, 0);
    }

    for (const unlock of allUnlocksForMonths) {
      const monthDate = new Date(unlock.unlockedAt.getFullYear(), unlock.unlockedAt.getMonth(), 1);
      const key = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
      if (monthBuckets.has(key)) {
        monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + 1);
      }
    }

    const monthlyPerformance = Array.from(monthBuckets.entries()).map(([key, leads]) => {
      const [year, month] = key.split("-").map(Number);
      const date = new Date(year, month, 1);
      return {
        month: monthLabel(date),
        leads,
      };
    });

    return NextResponse.json({
      success: true,
      filters: {
        from: start.toISOString(),
        to: end.toISOString(),
      },
      metrics: {
        totalLeadsReceived: totalUnlocks,
        leadsUnlockedInRange: filteredUnlocks,
        conversionRate,
      },
      history: recentUnlocks.map((entry) => ({
        id: entry.id,
        lead: entry.lead.name,
        area: entry.lead.area,
        status: entry.lead.status,
        date: entry.unlockedAt,
      })),
      monthlyPerformance,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_DATE") {
      return NextResponse.json(
        { success: false, message: "Filtro de data invalido." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Nao foi possivel carregar metricas do dashboard." },
      { status: 500 }
    );
  }
}
