export type PlanConfig = {
  id: "START" | "PRO" | "PREMIUM";
  name: string;
  type: "one_time" | "recurring";
  amountInCents: number;
  currency: "BRL";
  leadsLimit: "8" | "30" | "75";
  features: string[];
  stripePriceIdEnvKey?: string;
};

export const planCatalog: PlanConfig[] = [
  {
    id: "START",
    name: "Start",
    type: "one_time",
    amountInCents: 14700,
    currency: "BRL",
    leadsLimit: "8",
    features: [
      "8 contatos qualificados",
      "Nivel de urgencia do cliente",
      "Plano unico (nao renovavel)",
    ],
    stripePriceIdEnvKey: "STRIPE_PRICE_START",
  },
  {
    id: "PRO",
    name: "Pro",
    type: "recurring",
    amountInCents: 49700,
    currency: "BRL",
    leadsLimit: "30",
    features: [
      "30 contatos verificados",
      "Nivel de urgencia do cliente",
      "Plano sem fidelidade",
      "CRM interno",
    ],
    stripePriceIdEnvKey: "STRIPE_PRICE_PRO",
  },
  {
    id: "PREMIUM",
    name: "Premium",
    type: "recurring",
    amountInCents: 129700,
    currency: "BRL",
    leadsLimit: "75",
    features: [
      "75 contatos verificados",
      "Nivel de urgencia do cliente",
      "Plano sem fidelidade",
      "CRM interno",
      "Dashboard de resultados",
    ],
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
