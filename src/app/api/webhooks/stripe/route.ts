import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payment";
import { prisma } from "@/lib/db/prisma";

function isSupportedPlan(plan: unknown): plan is "START" | "PRO" | "PRIMUM" {
  return plan === "START" || plan === "PRO" || plan === "PRIMUM";
}

async function downgradeUserToStartBySubscriptionId(subscriptionId: string) {
  const subscription = await prisma.subscription.findFirst({
    where: { providerId: subscriptionId },
  });

  if (!subscription) return;

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "PAST_DUE" },
  });

  await prisma.user.update({
    where: { id: subscription.userId },
    data: { plan: "START", planExpiresAt: new Date() },
  });
}

async function processStripeEvent(event: Stripe.Event) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    const plan = session.metadata?.planId;
    const providerSubscriptionId =
      typeof session.subscription === "string" ? session.subscription : session.id;

    if (!userId || !isSupportedPlan(plan)) {
      return;
    }

    await prisma.subscription.upsert({
      where: { userId },
      update: {
        provider: "stripe",
        providerId: providerSubscriptionId,
        status: "ACTIVE",
        plan,
      },
      create: {
        userId,
        provider: "stripe",
        providerId: providerSubscriptionId,
        status: "ACTIVE",
        plan,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        planExpiresAt: null,
      },
    });

    return;
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionRef = invoice.parent?.subscription_details?.subscription;
    const subscriptionId = typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
    if (!subscriptionId) return;

    await downgradeUserToStartBySubscriptionId(subscriptionId);
    return;
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;

    const record = await prisma.subscription.findFirst({
      where: { providerId: subscription.id },
    });

    if (!record) return;

    await prisma.subscription.update({
      where: { id: record.id },
      data: { status: "CANCELED" },
    });

    await prisma.user.update({
      where: { id: record.userId },
      data: { plan: "START", planExpiresAt: new Date() },
    });
    return;
  }

  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionRef = invoice.parent?.subscription_details?.subscription;
    const subscriptionId = typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
    if (!subscriptionId) return;

    const record = await prisma.subscription.findFirst({ where: { providerId: subscriptionId } });
    if (!record) return;

    await prisma.subscription.update({
      where: { id: record.id },
      data: { status: "ACTIVE" },
    });

    await prisma.user.update({
      where: { id: record.userId },
      data: { plan: record.plan, planExpiresAt: null },
    });
  }
}

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ success: false, message: "Assinatura Stripe ausente." }, { status: 400 });
    }

    const payload = await request.text();
    const provider = getPaymentProvider();
    const webhookEvent = await provider.handleWebhook(payload, signature);

    await processStripeEvent(webhookEvent.payload as Stripe.Event);

    return NextResponse.json({ success: true, eventType: webhookEvent.type });
  } catch {
    return NextResponse.json({ success: false, message: "Falha ao processar webhook Stripe." }, { status: 400 });
  }
}