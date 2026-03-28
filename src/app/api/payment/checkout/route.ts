import { NextResponse } from "next/server";
import { z } from "zod";
import { getPaymentProvider } from "@/lib/payment";
import { requireAppUser } from "@/lib/auth/requireAppUser";

const payloadSchema = z.object({
  planId: z.enum(["PRO", "PREMIUM"]),
});

export async function POST(request: Request) {
  const auth = await requireAppUser(["LAWYER", "ADMIN"]);
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const payload = payloadSchema.parse(body);

    const provider = getPaymentProvider();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const checkout = await provider.createCheckout({
      userId: auth.user.id,
      planId: payload.planId,
      successUrl: `${appUrl}/dashboard?checkout=success`,
      cancelUrl: `${appUrl}/dashboard?checkout=canceled`,
      customerEmail: auth.user.email,
    });

    return NextResponse.json({
      success: true,
      url: checkout.url,
      planId: payload.planId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Payload invalido.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Nao foi possivel iniciar o checkout." },
      { status: 500 }
    );
  }
}
