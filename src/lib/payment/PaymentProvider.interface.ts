export type SubscriptionStatus = "ACTIVE" | "CANCELED" | "PAST_DUE" | "INCOMPLETE";

export type CheckoutData = {
  userId: string;
  planId: "START" | "PRO" | "PREMIUM";
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
};

export type WebhookEvent = {
  type: string;
  providerEventId: string;
  payload: unknown;
};

export interface PaymentProvider {
  createSubscription(userId: string, planId: string): Promise<{ url: string }>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus>;
  createCheckout(data: CheckoutData): Promise<{ url: string }>;
  handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent>;
}
