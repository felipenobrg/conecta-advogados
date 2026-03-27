import { NextResponse } from "next/server";
import { z } from "zod";
import { generateOtpCode, saveOtp, sendOtpToWhatsapp } from "@/lib/twilioOtp";

const requestSchema = z.object({
  phone: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone } = requestSchema.parse(body);

    const code = generateOtpCode();
    saveOtp(phone, code);
    await sendOtpToWhatsapp(phone, code);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Telefone invalido.", issues: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Nao foi possivel enviar o codigo OTP." },
      { status: 500 }
    );
  }
}
