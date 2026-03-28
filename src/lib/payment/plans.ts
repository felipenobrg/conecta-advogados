export type PlanConfig = {
  id: "START" | "PRO" | "PREMIUM";
  name: string;
  type: "one_time" | "recurring";
  amountInCents: number;
  currency: "BRL";
  leadsLimit: "8" | "unlimited";
  features: string[];
  stripePriceIdEnvKey?: string;
};

export const planCatalog: PlanConfig[] = [
  {
    id: "START",
    name: "Start",
    type: "one_time",
    amountInCents: Number(process.env.NEXT_PUBLIC_PLAN_START_PRICE_CENTS ?? 0),
    currency: "BRL",
    leadsLimit: "8",
    features: ["Ate 8 contatos"],
    stripePriceIdEnvKey: "STRIPE_PRICE_START",
  },
  {
    id: "PRO",
    name: "Pro",
    type: "recurring",
    amountInCents: Number(process.env.NEXT_PUBLIC_PLAN_PRO_PRICE_CENTS ?? 0),
    currency: "BRL",
    leadsLimit: "unlimited",
    features: ["Contatos ilimitados"],
    stripePriceIdEnvKey: "STRIPE_PRICE_PRO",
  },
  {
    id: "PREMIUM",
    name: "Premium",
    type: "recurring",
    amountInCents: Number(process.env.NEXT_PUBLIC_PLAN_PREMIUM_PRICE_CENTS ?? 0),
    currency: "BRL",
    leadsLimit: "unlimited",
    features: ["Contatos ilimitados", "Dashboard premium"],
    stripePriceIdEnvKey: "STRIPE_PRICE_PREMIUM",
  },
];

export function getPlanById(planId: string): PlanConfig {
  const plan = planCatalog.find((entry) => entry.id === planId);
  if (!plan) {
    throw new Error(`Plano invalido: ${planId}`);
  }

  return plan;
}
