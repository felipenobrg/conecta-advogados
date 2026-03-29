import { NextResponse } from "next/server";
import { requirePlan } from "@/lib/auth/requirePlan";
import { prisma } from "@/lib/db/prisma";

type AllowedLeadStatus = "PENDING" | "CONTACTED" | "CONVERTED" | "LOST";
type AllowedUrgency = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

function parseStatus(input: string | null): AllowedLeadStatus | null {
  if (input === "PENDING" || input === "CONTACTED" || input === "CONVERTED" || input === "LOST") {
    return input;
  }

  return null;
}

function parseUrgency(input: string | null): AllowedUrgency | null {
  if (input === "LOW" || input === "MEDIUM" || input === "HIGH" || input === "URGENT") {
    return input;
  }

  return null;
}

function escapeCsvCell(value: string | number | null) {
  if (value === null) {
    return "";
  }

  const content = String(value);
  return `"${content.replaceAll('"', '""')}"`;
}

function maskEmail(email: string) {
  const [localPart, domainPart] = email.split("@");
  if (!domainPart) {
    return "***";
  }

  const first = localPart?.[0] ?? "*";
  return `${first}***@${domainPart}`;
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) {
    return "(**) *****-****";
  }

  return `(**) *****-${digits.slice(-4)}`;
}

function statusLabel(status: AllowedLeadStatus) {
  if (status === "CONTACTED") return "Contatado";
  if (status === "CONVERTED") return "Convertido";
  if (status === "LOST") return "Perdido";
  return "Pendente";
}

function urgencyLabel(urgency: string) {
  if (urgency === "URGENT") return "Urgente";
  if (urgency === "HIGH") return "Alta";
  if (urgency === "LOW") return "Baixa";
  return "Média";
}

export async function GET(request: Request) {
  try {
    const planAuth = await requirePlan(["PREMIUM"], {
      allowedRoles: ["LAWYER", "ADMIN"],
      message: "A exportação CSV está disponível apenas no plano Premium.",
    });

    if (!planAuth.ok) {
      return planAuth.response;
    }

    const { searchParams } = new URL(request.url);
    const area = searchParams.get("area")?.trim() || "";
    const state = searchParams.get("state")?.trim() || "";
    const city = searchParams.get("city")?.trim() || "";
    const neighborhood = searchParams.get("neighborhood")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";
    const status = parseStatus(searchParams.get("status")?.trim() || null);
    const urgency = parseUrgency(searchParams.get("urgency")?.trim() || null);

    const baseWhere = {
      ...(area
        ? {
            area: {
              contains: area,
              mode: "insensitive" as const,
            },
          }
        : {}),
      ...(state
        ? {
            state: {
              contains: state,
              mode: "insensitive" as const,
            },
          }
        : {}),
      ...(city
        ? {
            city: {
              contains: city,
              mode: "insensitive" as const,
            },
          }
        : {}),
      ...(neighborhood
        ? {
            neighborhood: {
              contains: neighborhood,
              mode: "insensitive" as const,
            },
          }
        : {}),
      ...(status ? { status } : {}),
      ...(urgency ? { urgency } : {}),
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                email: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                phone: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                area: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                city: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
              {
                neighborhood: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const where = baseWhere;

    const leads = await prisma.lead.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: 5000,
      select: {
        id: true,
        clientId: true,
        name: true,
        email: true,
        phone: true,
        area: true,
        state: true,
        city: true,
        neighborhood: true,
        urgency: true,
        status: true,
        createdAt: true,
        unlocks: {
          where: {
            userId: planAuth.user.id,
          },
          select: {
            id: true,
          },
          take: 1,
        },
        _count: {
          select: {
            unlocks: true,
          },
        },
      },
    });

    const header = [
      "ID",
      "Nome",
      "Área",
      "Estado",
      "Cidade",
      "Bairro",
      "Urgência",
      "Status",
      "E-mail",
      "Telefone",
      "E-mail mascarado",
      "Telefone mascarado",
      "Desbloqueado",
      "Total de desbloqueios",
      "Criado em",
    ];

    const rows = leads.map((lead) => {
      const isUnlocked = planAuth.user.role === "ADMIN" || lead.clientId === planAuth.user.id || lead.unlocks.length > 0;
      return [
        lead.id,
        lead.name,
        lead.area,
        lead.state,
        lead.city ?? "",
        lead.neighborhood ?? "",
        urgencyLabel(lead.urgency),
        statusLabel(lead.status),
        isUnlocked ? lead.email : "",
        isUnlocked ? lead.phone : "",
        maskEmail(lead.email),
        maskPhone(lead.phone),
        isUnlocked ? "sim" : "não",
        String(lead._count.unlocks),
        lead.createdAt.toISOString(),
      ];
    });

    const csvLines = [header, ...rows].map((row) => row.map((cell) => escapeCsvCell(cell)).join(","));
    const csvBody = csvLines.join("\n");

    return new NextResponse(csvBody, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"leads-premium-${new Date().toISOString().slice(0, 10)}.csv\"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Não foi possível exportar os leads em CSV." },
      { status: 500 }
    );
  }
}
