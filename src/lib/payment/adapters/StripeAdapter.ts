import Stripe from "stripe";
import {
  type CheckoutData,
  type PaymentProvider,
  type SubscriptionStatus,
  type WebhookEvent,
} from "../PaymentProvider.interface";
import { getPlanById } from "../plans";

const stripeApiVersion: Stripe.LatestApiVersion = "2026-03-25.dahlia";

export class StripeAdapter implements PaymentProvider {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY nao foi configurada.");
    }

    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: stripeApiVersion,
    });
  }

  async createSubscription(userId: string, planId: string): Promise<{ url: string }> {
    const plan = getPlanById(planId);
    if (!plan.stripePriceIdEnvKey) {
      throw new Error(`Plano ${planId} nao possui price id para Stripe.`);
    }

    const priceId = process.env[plan.stripePriceIdEnvKey];
    if (!priceId) {
      throw new Error(`Variavel ${plan.stripePriceIdEnvKey} nao configurada.`);
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: plan.type === "recurring" ? "subscription" : "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding?checkout=canceled`,
      client_reference_id: userId,
      metadata: { planId },
    });

    if (!session.url) {
      throw new Error("Stripe nao retornou URL para checkout.");
    }

    return { url: session.url };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.cancel(subscriptionId);
  }

  async getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus> {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

    const map: Record<string, SubscriptionStatus> = {
      active: "ACTIVE",
      canceled: "CANCELED",
      past_due: "PAST_DUE",
      incomplete: "INCOMPLETE",
    };

    return map[subscription.status] ?? "INCOMPLETE";
  }

  async createCheckout(data: CheckoutData): Promise<{ url: string }> {
    const plan = getPlanById(data.planId);
    if (!plan.stripePriceIdEnvKey) {
      throw new Error(`Plano ${data.planId} nao possui price id para Stripe.`);
    }

    const priceId = process.env[plan.stripePriceIdEnvKey];
    if (!priceId) {
      throw new Error(`Variavel ${plan.stripePriceIdEnvKey} nao configurada.`);
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: plan.type === "recurring" ? "subscription" : "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: data.successUrl,
      cancel_url: data.cancelUrl,
      customer_email: data.customerEmail,
      client_reference_id: data.userId,
      metadata: {
        userId: data.userId,
        planId: data.planId,
      },
    });

    if (!session.url) {
      throw new Error("Stripe nao retornou URL para checkout.");
    }

    return { url: session.url };
  }

  async handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent> {
    if (!this.webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET nao foi configurada.");
    }

    if (typeof payload !== "string") {
      throw new Error("Payload do webhook deve ser string bruta do body.");
    }

    const event = this.stripe.webhooks.constructEvent(payload, signature, this.webhookSecret);

    return {
      type: event.type,
      providerEventId: event.id,
      payload: event,
    };
  }
}
