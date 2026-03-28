import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const stepThrottleMs = 400;
const stepRequestCache = new Map<string, { requestedAt: number; step: number }>();

const requestSchema = z.object({
  sessionId: z.string().min(10),
  step: z.number().min(1).max(9),
  data: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, step, data } = requestSchema.parse(body);

    const now = Date.now();
    const lastRequest = stepRequestCache.get(sessionId);
    const isSameStepBurst =
      Boolean(lastRequest) &&
      lastRequest?.step === step &&
      now - lastRequest.requestedAt < stepThrottleMs;

    if (isSameStepBurst) {
      return NextResponse.json(
        {
          success: false,
          code: "ONBOARDING_STEP_RATE_LIMIT",
          message: "Muitas atualizacoes em sequencia. Aguarde um instante e tente novamente.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(stepThrottleMs / 1000)),
          },
        }
      );
    }

    stepRequestCache.set(sessionId, { requestedAt: now, step });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
    if (!url || !serviceRoleKey) {
      return NextResponse.json(
        {
          success: false,
          code: "SUPABASE_NOT_CONFIGURED",
          message: "Supabase nao configurado para persistencia do onboarding.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: latestSteps, error: latestStepError } = await supabase
      .from("onboarding_steps")
      .select("step")
      .eq("session_id", sessionId)
      .order("step", { ascending: false })
      .limit(1);

    if (latestStepError) {
      return NextResponse.json(
        {
          success: false,
          code: "ONBOARDING_STEP_LOOKUP_FAILED",
          message: "Nao foi possivel validar a sequencia do onboarding.",
        },
        { status: 500 }
      );
    }

    const maxSavedStep = latestSteps?.[0]?.step ?? 0;
    const isUpdateOfExistingOrCurrent = step <= maxSavedStep;
    const isNextStep = step === maxSavedStep + 1;

    if (!isUpdateOfExistingOrCurrent && !isNextStep) {
      return NextResponse.json(
        {
          success: false,
          code: "ONBOARDING_STEP_SEQUENCE_INVALID",
          message: "Sequencia de etapas invalida. Avance em ordem para continuar.",
          expectedNextStep: maxSavedStep + 1,
        },
        { status: 409 }
      );
    }

    const { error } = await supabase.from("onboarding_steps").upsert(
      {
        session_id: sessionId,
        step,
        payload: data,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "session_id,step",
      }
    );

    if (error) {
      return NextResponse.json(
        {
          success: false,
          code: "ONBOARDING_PERSIST_FAILED",
          message: "Falha ao persistir onboarding no Supabase.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, savedStep: step });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: "Payload invalido.",
          issues: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        code: "ONBOARDING_STEP_UNEXPECTED",
        message: "Falha ao salvar etapa do onboarding.",
      },
      { status: 500 }
    );
  }
}
