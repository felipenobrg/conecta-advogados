import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const requestSchema = z.object({
  sessionId: z.string().min(10),
  step: z.number().min(1).max(7),
  data: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, step, data } = requestSchema.parse(body);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
    if (!url || !serviceRoleKey) {
      return NextResponse.json(
        { success: false, message: "Supabase nao configurado para persistencia do onboarding." },
        { status: 500 }
      );
    }

    const supabase = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

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
        { success: false, message: "Falha ao persistir onboarding no Supabase." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Payload invalido.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Falha ao salvar etapa do onboarding." },
      { status: 500 }
    );
  }
}
