import { NextResponse } from "next/server";
import { z } from "zod";
import { OtpSendError, generateOtpCode, saveOtp, sendOtpToWhatsapp } from "@/lib/twilioOtp";

const requestSchema = z.object({
  phone: z
    .string()
    .min(8)
    .regex(/^\+?[1-9][0-9]{7,14}$/, "Telefone deve estar em formato internacional. Ex: +5511999999999"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone } = requestSchema.parse(body);

    const code = generateOtpCode();
    const delivery = await sendOtpToWhatsapp(phone, code);
    saveOtp(phone, code);

    return NextResponse.json({
      success: true,
      message: "Codigo enviado no WhatsApp com sucesso.",
      delivery: {
        provider: "twilio",
        messageId: delivery.sid,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: "Telefone invalido. Use formato internacional com DDI. Ex: +5511999999999",
          issues: error.issues,
        },
        { status: 400 }
      );
    }

    if (error instanceof OtpSendError) {
      if (error.reason === "CONFIG_MISSING") {
        return NextResponse.json(
          {
            success: false,
            message: "Servico de OTP nao configurado. Verifique as credenciais da Twilio.",
            code: error.reason,
          },
          { status: error.statusCode }
        );
      }

      if (error.reason === "PROVIDER_REJECTED") {
        return NextResponse.json(
          {
            success: false,
            message:
              "Nao foi possivel enviar no WhatsApp. Confira numero, sandbox da Twilio e credenciais.",
            code: error.reason,
            providerMessage: error.providerMessage,
          },
          { status: error.statusCode }
        );
      }

      if (error.reason === "NETWORK_FAILURE") {
        return NextResponse.json(
          {
            success: false,
            message: "Falha de comunicacao com o provedor OTP. Tente novamente em instantes.",
            code: error.reason,
          },
          { status: error.statusCode }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "Falha inesperada no envio do OTP.",
          code: error.reason,
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, message: "Nao foi possivel enviar o codigo OTP." },
      { status: 500 }
    );
  }
}
