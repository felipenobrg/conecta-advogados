import { NextResponse } from "next/server";
import { z } from "zod";
import { validateOtp } from "@/lib/twilioOtp";

const requestSchema = z.object({
  phone: z.string().min(8),
  code: z.string().min(4),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, code } = requestSchema.parse(body);

    const valid = validateOtp(phone, code);
    if (!valid) {
      return NextResponse.json(
        { success: false, message: "Codigo invalido ou expirado." },
        { status: 400 }
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
      { success: false, message: "Falha na validacao do codigo." },
      { status: 500 }
    );
  }
}
