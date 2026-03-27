import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type ScarcityRow = {
  id?: string;
  name?: string;
  full_name?: string;
  area?: string;
  practice_area?: string;
  state?: string;
  uf?: string;
  createdAt?: string;
  created_at?: string;
};

function toDisplayName(rawName: string) {
  const parts = rawName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "Usuario";

  const first = parts[0];
  const firstFormatted = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();

  if (parts.length === 1) {
    return `${firstFormatted}.`;
  }

  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${firstFormatted} ${lastInitial}.`;
}

export async function GET() {
  const windowDays = 30;
  const debug: string[] = [];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SECRET_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return NextResponse.json(
      {
        success: false,
        totalRequests: 0,
        windowDays,
        items: [],
        debug: ["Supabase URL/chave nao configuradas."],
      },
      { status: 500 }
    );
  }

  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const tableCandidates = ["Lead", "lead", "leads"];
  const selectCandidates = [
    "id,name,area,state,createdAt",
    "id,name,area,state,created_at",
    "id,name,area,state",
    "id,full_name,practice_area,uf,created_at",
    "id,full_name,practice_area,uf",
  ];

  for (const tableName of tableCandidates) {
    for (const selectExpr of selectCandidates) {
      const { data, error, count } = await supabase
        .from(tableName)
        .select(selectExpr, { count: "exact" })
        .order("id", { ascending: false })
        .limit(16);

      if (error) {
        debug.push(`${tableName} | ${selectExpr} -> ${error.message}`);
        continue;
      }

      const rows = (data ?? []) as ScarcityRow[];
      const totalRequests = count ?? rows.length;

      const items = rows
        .map((row, index) => {
          const rawName = row.name ?? row.full_name ?? "Usuario";
          const area = row.area ?? row.practice_area ?? "Direito Civil";
          const state = row.state ?? row.uf ?? "SP";
          const requestedAt = row.createdAt ?? row.created_at ?? new Date().toISOString();

          return {
            id: row.id ?? `${tableName}-${index}`,
            displayName: toDisplayName(rawName),
            area,
            state,
            requestedAt,
          };
        })
        .filter((row) => row.displayName && row.area && row.state);

      return NextResponse.json(
        {
          success: true,
          totalRequests,
          windowDays,
          items,
          sourceTable: tableName,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      totalRequests: 0,
      windowDays,
      items: [],
      debug,
    },
    { status: 500 }
  );
}
