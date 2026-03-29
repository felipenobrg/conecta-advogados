import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAppUser } from "@/lib/auth/requireAppUser";
import { requireLawyerPayment } from "@/lib/auth/requireLawyerPayment";

type AllowedLeadStatus = "PENDING" | "CONTACTED" | "CONVERTED" | "LOST";
type AllowedUrgency = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type AllowedSortBy = "createdAt" | "updatedAt" | "urgency" | "status" | "area" | "state" | "city";
type AllowedSortDir = "asc" | "desc";

const createLeadSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  area: z.string().min(2),
  state: z.string().min(2).max(2),
  whatsappVerified: z.boolean().optional(),
});

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

function parseSortBy(input: string | null): AllowedSortBy {
  if (
    input === "createdAt" ||
    input === "updatedAt" ||
    input === "urgency" ||
    input === "status" ||
    input === "area" ||
    input === "state" ||
    input === "city"
  ) {
    return input;
  }

  return "createdAt";
}

function parseSortDir(input: string | null): AllowedSortDir {
  if (input === "asc" || input === "desc") {
    return input;
  }

  return "desc";
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

function getUserUnlockQuotaByPlan(plan: "START" | "PRO" | "PREMIUM", role: "CLIENT" | "LAWYER" | "ADMIN") {
  if (role === "ADMIN") {
    return Number.POSITIVE_INFINITY;
  }

  if (plan === "START") {
    const startLimit = Number(process.env.LEAD_UNLOCK_LIMIT_START ?? 8);
    return Number.isFinite(startLimit) ? Math.max(0, Math.floor(startLimit)) : 8;
  }

  if (plan === "PRO") {
    const proLimit = Number(process.env.LEAD_UNLOCK_LIMIT_PRO ?? 30);
    return Number.isFinite(proLimit) ? Math.max(0, Math.floor(proLimit)) : Number.POSITIVE_INFINITY;
  }

  const premiumLimit = Number(process.env.LEAD_UNLOCK_LIMIT_PREMIUM ?? 75);
  return Number.isFinite(premiumLimit) ? Math.max(0, Math.floor(premiumLimit)) : Number.POSITIVE_INFINITY;
}

function getLeadOfficeCap() {
  const defaultCap = 3;
  const cap = Number(process.env.LEAD_UNLOCK_MAX_PER_LEAD ?? defaultCap);
  return Number.isFinite(cap) ? Math.max(1, Math.floor(cap)) : defaultCap;
}

function getOrderBy(sortBy: AllowedSortBy, sortDir: AllowedSortDir) {
  if (sortBy === "city") {
    return [{ city: sortDir }, { createdAt: "desc" as const }];
  }

  return [{ [sortBy]: sortDir }, { createdAt: "desc" as const }];
}

export async function GET(request: Request) {
  try {
    const auth = await requireAppUser(["LAWYER", "ADMIN", "CLIENT"]);
    if (!auth.ok) {
      return auth.response;
    }

    const paymentGate = requireLawyerPayment(auth.user);
    if (paymentGate) {
      return paymentGate;
    }

    const { searchParams } = new URL(request.url);
    const area = searchParams.get("area")?.trim() || "";
    const state = searchParams.get("state")?.trim() || "";
    const city = searchParams.get("city")?.trim() || "";
    const neighborhood = searchParams.get("neighborhood")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";
    const status = parseStatus(searchParams.get("status")?.trim() || null);
    const urgency = parseUrgency(searchParams.get("urgency")?.trim() || null);
    const sortBy = parseSortBy(searchParams.get("sortBy")?.trim() || null);
    const sortDir = parseSortDir(searchParams.get("sortDir")?.trim() || null);
    const pageRaw = Number(searchParams.get("page") ?? 1);
    const pageSizeRaw = Number(searchParams.get("pageSize") ?? 10);

    const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
    const pageSize = Number.isFinite(pageSizeRaw)
      ? Math.min(50, Math.max(5, Math.floor(pageSizeRaw)))
      : 10;

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

    const where =
      auth.user.role === "ADMIN"
        ? baseWhere
        : auth.user.role === "CLIENT"
        ? {
            ...baseWhere,
            clientId: auth.user.id,
          }
        : baseWhere;

    const isLawyer = auth.user.role === "LAWYER";
    const userUnlockQuota = isLawyer
      ? getUserUnlockQuotaByPlan(auth.user.plan, auth.user.role)
      : Number.POSITIVE_INFINITY;
    const leadOfficeCap = getLeadOfficeCap();

    const [userUnlockCount, total, groupedByStatus, leads] = await Promise.all([
      isLawyer
        ? prisma.leadUnlock.count({
            where: {
              userId: auth.user.id,
            },
          })
        : Promise.resolve(0),
      prisma.lead.count({ where }),
      prisma.lead.groupBy({
        by: ["status"],
        where,
        _count: {
          _all: true,
        },
      }),
      prisma.lead.findMany({
        where,
        orderBy: getOrderBy(sortBy, sortDir),
        skip: (page - 1) * pageSize,
        take: pageSize,
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
          gender: true,
          updatedAt: true,
          status: true,
          createdAt: true,
          unlocks: {
            where: {
              userId: auth.user.id,
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
      }),
    ]);

    const groupedStatusCount = groupedByStatus.reduce(
      (acc, item: (typeof groupedByStatus)[number]) => {
        acc[item.status] = item._count._all;
        return acc;
      },
      {
        PENDING: 0,
        CONTACTED: 0,
        CONVERTED: 0,
        LOST: 0,
      }
    );

    const remainingUnlocks = Number.isFinite(userUnlockQuota)
      ? Math.max(0, userUnlockQuota - userUnlockCount)
      : Number.POSITIVE_INFINITY;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return NextResponse.json({
      success: true,
      page,
      pageSize,
      total,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
      access: {
        role: auth.user.role,
        plan: auth.user.plan,
        leadOfficeCap,
        quota: {
          unlocksUsed: userUnlockCount,
          unlocksLimit: Number.isFinite(userUnlockQuota) ? userUnlockQuota : null,
          unlocksRemaining: Number.isFinite(remainingUnlocks) ? remainingUnlocks : null,
          isUnlimited: !Number.isFinite(userUnlockQuota),
        },
      },
      summary: {
        pending: groupedStatusCount.PENDING,
        contacted: groupedStatusCount.CONTACTED,
        converted: groupedStatusCount.CONVERTED,
        lost: groupedStatusCount.LOST,
      },
      leads: leads.map((lead: (typeof leads)[number]) => ({
        isUnlocked:
          auth.user.role === "ADMIN" ||
          lead.clientId === auth.user.id ||
          lead.unlocks.length > 0,
        id: lead.id,
        name: lead.name,
        email:
          auth.user.role === "ADMIN" || lead.clientId === auth.user.id || lead.unlocks.length > 0
            ? lead.email
            : null,
        phone:
          auth.user.role === "ADMIN" || lead.clientId === auth.user.id || lead.unlocks.length > 0
            ? lead.phone
            : null,
        maskedEmail: maskEmail(lead.email),
        maskedPhone: maskPhone(lead.phone),
        area: lead.area,
        state: lead.state,
        city: lead.city,
        neighborhood: lead.neighborhood,
        urgency: lead.urgency,
        gender: lead.gender,
        status: lead.status,
        isOwner: lead.clientId === auth.user.id,
        unlockCount: lead._count.unlocks,
        canUnlock:
          isLawyer &&
          lead.unlocks.length === 0 &&
          remainingUnlocks > 0 &&
          lead._count.unlocks < leadOfficeCap,
        lockReason:
          isLawyer && lead.unlocks.length === 0
            ? remainingUnlocks <= 0
              ? "Você atingiu o limite de desbloqueios do seu plano."
              : lead._count.unlocks >= leadOfficeCap
              ? "Este lead já atingiu o limite de escritórios desbloqueados."
              : null
            : null,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
      })),
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Não foi possível carregar leads." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAppUser(["ADMIN"]);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const payload = createLeadSchema.parse(body);

    const lead = await prisma.lead.create({
      data: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        area: payload.area,
        state: payload.state.toUpperCase(),
        whatsappVerified: payload.whatsappVerified ?? false,
        clientId: null,
        statusUpdatedBy: auth.user.role,
        statusUpdatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        area: true,
        state: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Lead criado com sucesso.",
        lead,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Payload invalido.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Nao foi possivel criar lead." },
      { status: 500 }
    );
  }
}
