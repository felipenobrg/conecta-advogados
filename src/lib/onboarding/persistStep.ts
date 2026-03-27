import { z } from "zod";

const payloadSchema = z.object({
  sessionId: z.string().min(10),
  step: z.number().min(1).max(6),
  data: z.record(z.string(), z.unknown()),
});

export type PersistStepPayload = z.infer<typeof payloadSchema>;

export async function persistStep(payload: PersistStepPayload): Promise<void> {
  const parsed = payloadSchema.parse(payload);

  const response = await fetch("/api/onboarding/step", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parsed),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Nao foi possivel salvar a etapa do onboarding.");
  }
}
