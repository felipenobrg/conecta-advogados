import { z } from "zod";

const completeOnboardingPayloadSchema = z.object({
  sessionId: z.string().min(10),
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(8),
  phoneVerified: z.boolean(),
  consentAccepted: z.boolean(),
  role: z.enum(["LAWYER", "CLIENT"]),
  selectedPlan: z.enum(["START", "PRO", "PRIMUM"]).optional(),
  practiceAreas: z.array(z.string()).default([]),
});

export type CompleteOnboardingPayload = z.infer<typeof completeOnboardingPayloadSchema>;

export async function completeOnboarding(payload: CompleteOnboardingPayload) {
  const parsed = completeOnboardingPayloadSchema.parse(payload);

  const response = await fetch("/api/onboarding/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parsed),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Nao foi possivel concluir o onboarding.");
  }

  return response.json() as Promise<{ success: boolean; nextPath: string; paymentPending: boolean }>;
}