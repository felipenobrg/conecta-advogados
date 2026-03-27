import { NextResponse } from "next/server";
import { z } from "zod";
import { validateOtp } from "@/lib/twilioOtp";

const requestSchema = z.object({
  phone: z
    .string()
    .min(8)
    .regex(/^\+?[1-9][0-9]{7,14}$/, "Telefone deve estar em formato internacional. Ex: +5511999999999"),
  code: z.string().regex(/^\d{4,8}$/, "Codigo OTP deve conter apenas numeros."),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, code } = requestSchema.parse(body);

    const valid = validateOtp(phone, code);
    if (!valid) {
      return NextResponse.json(
        {
          success: false,
          message: "Codigo invalido ou expirado. Solicite um novo OTP e tente novamente.",
          code: "OTP_INVALID_OR_EXPIRED",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Codigo validado com sucesso.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Payload invalido. Verifique telefone e codigo OTP.",
          issues: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Falha na validacao do codigo." },
      { status: 500 }
    );
  }
}
