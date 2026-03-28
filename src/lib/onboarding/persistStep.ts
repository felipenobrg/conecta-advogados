import { z } from "zod";

const payloadSchema = z.object({
  sessionId: z.string().min(10),
  step: z.number().min(1).max(9),
  data: z.record(z.string(), z.unknown()),
});

export type PersistStepPayload = z.infer<typeof payloadSchema>;

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function persistStep(payload: PersistStepPayload): Promise<void> {
  const parsed = payloadSchema.parse(payload);

  async function sendRequest() {
    return fetch("/api/onboarding/step", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed),
    });
  }

  let response = await sendRequest();

  if (response.status === 429) {
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : Number.NaN;
    const retryDelayMs = Number.isFinite(retryAfterSeconds)
      ? Math.max(300, retryAfterSeconds * 1000)
      : 600;

    await sleep(retryDelayMs);
    response = await sendRequest();
  }

  if (!response.ok) {
    const fallbackMessage = "Nao foi possivel salvar a etapa do onboarding.";
    const errorPayload = (await response.json().catch(() => null)) as
      | {
          message?: string;
          issues?: Array<{ path?: Array<string | number>; message?: string }>;
        }
      | null;

    const issues = errorPayload?.issues
      ?.map((issue) => {
        const field = issue.path?.length ? String(issue.path[issue.path.length - 1]) : "";
        if (field && issue.message) return `${field}: ${issue.message}`;
        return issue.message;
      })
      .filter(Boolean)
      .join(" | ");

    const message = [errorPayload?.message, issues].filter(Boolean).join(" - ") || fallbackMessage;
    throw new Error(message);
  }
}
