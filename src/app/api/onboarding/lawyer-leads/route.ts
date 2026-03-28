import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/db/prisma";

const MAX_UNLOCKS = 3;

function buildNeedText(area: string, state: string) {
  return `Cliente em ${state.toUpperCase()} precisa de apoio em ${area}.`;
}

type LeadRecord = {
  id: string;
  name: string;
  area: string;
  state: string;
  createdAt: string;
  unlockCount: number;
};

function toOnboardingPayload(leads: LeadRecord[]) {
  return leads
    .filter((lead) => lead.unlockCount < MAX_UNLOCKS)
    .map((lead) => ({
      id: lead.id,
      name: lead.name,
      area: lead.area,
      state: lead.state,
      urgent: lead.unlockCount === 0,
      interestedCount: lead.unlockCount,
      interestedLimit: MAX_UNLOCKS,
      needText: buildNeedText(lead.area, lead.state),
      createdAt: lead.createdAt,
    }));
}

async function loadFromSupabase(): Promise<LeadRecord[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase URL/chave nao configuradas para fallback.");
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: leadRows, error: leadError } = await supabase
    .from("Lead")
    .select("id,name,area,state,createdAt,status")
    .eq("status", "PENDING")
    .order("createdAt", { ascending: false })
    .limit(12);

  if (leadError) {
    throw new Error(`Falha ao buscar leads no Supabase: ${leadError.message}`);
  }

  const leadIds = (leadRows ?? []).map((lead) => lead.id as string);
  if (leadIds.length === 0) {
    return [];
  }

  const { data: unlockRows, error: unlockError } = await supabase
    .from("LeadUnlock")
    .select("leadId")
    .in("leadId", leadIds);

  if (unlockError) {
    throw new Error(`Falha ao buscar desbloqueios no Supabase: ${unlockError.message}`);
  }

  const unlockCountMap = (unlockRows ?? []).reduce<Record<string, number>>((acc, row) => {
    const leadId = String(row.leadId);
    acc[leadId] = (acc[leadId] ?? 0) + 1;
    return acc;
  }, {});

  return (leadRows ?? []).map((lead) => ({
    id: String(lead.id),
    name: String(lead.name),
    area: String(lead.area),
    state: String(lead.state),
    createdAt: String(lead.createdAt),
    unlockCount: unlockCountMap[String(lead.id)] ?? 0,
  }));
}

export async function GET() {
  try {
    let leadRecords: LeadRecord[] = [];

    try {
      const leads = await prisma.lead.findMany({
        where: {
          status: "PENDING",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
        select: {
          id: true,
          name: true,
          area: true,
          state: true,
          createdAt: true,
          _count: {
            select: {
              unlocks: true,
            },
          },
        },
      });

      leadRecords = leads.map((lead) => ({
        id: lead.id,
        name: lead.name,
        area: lead.area,
        state: lead.state,
        createdAt: lead.createdAt.toISOString(),
        unlockCount: lead._count.unlocks,
      }));
    } catch {
      leadRecords = await loadFromSupabase();
    }

    const payload = toOnboardingPayload(leadRecords).slice(0, 6);

    return NextResponse.json({
      success: true,
      leads: payload,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Nao foi possivel carregar os leads para onboarding.",
      },
      { status: 500 }
    );
  }
}
