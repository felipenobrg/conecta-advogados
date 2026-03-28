import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAppUser } from "@/lib/auth/requireAppUser";
import { requireLawyerPayment } from "@/lib/auth/requireLawyerPayment";

type AllowedLeadStatus = "PENDING" | "CONTACTED" | "CONVERTED" | "LOST";

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
    const status = parseStatus(searchParams.get("status")?.trim() || null);
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
      ...(status ? { status } : {}),
    };

    const where =
      auth.user.role === "ADMIN"
        ? baseWhere
        : auth.user.role === "CLIENT"
        ? {
            ...baseWhere,
            clientId: auth.user.id,
          }
        : {
            ...baseWhere,
            unlocks: {
              some: {
                userId: auth.user.id,
              },
            },
          };

    const [total, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
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
          status: true,
          createdAt: true,
          _count: {
            select: {
              unlocks: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      leads: leads.map((lead: (typeof leads)[number]) => ({
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        area: lead.area,
        state: lead.state,
        status: lead.status,
        isOwner: lead.clientId === auth.user.id,
        unlockCount: lead._count.unlocks,
        createdAt: lead.createdAt,
      })),
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Nao foi possivel carregar leads." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAppUser(["CLIENT", "ADMIN"]);
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
        clientId: auth.user.role === "CLIENT" ? auth.user.id : null,
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
