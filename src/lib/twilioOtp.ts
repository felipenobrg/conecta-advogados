import crypto from "node:crypto";

const otpStore = new Map<string, { codeHash: string; expiresAt: number }>();

export class OtpSendError extends Error {
  readonly reason:
    | "CONFIG_MISSING"
    | "PROVIDER_REJECTED"
    | "NETWORK_FAILURE"
    | "UNKNOWN";
  readonly statusCode: number;
  readonly providerMessage?: string;

  constructor(
    reason: OtpSendError["reason"],
    message: string,
    statusCode: number,
    providerMessage?: string
  ) {
    super(message);
    this.name = "OtpSendError";
    this.reason = reason;
    this.statusCode = statusCode;
    this.providerMessage = providerMessage;
  }
}

type TwilioMessageResponse = {
  sid?: string;
  message?: string;
  code?: number;
};

export function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function hashOtp(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function ensureTwilioConfig() {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    throw new OtpSendError(
      "CONFIG_MISSING",
      "TWILIO_ACCOUNT_SID nao configurada.",
      503
    );
  }

  if (!process.env.TWILIO_AUTH_TOKEN) {
    throw new OtpSendError(
      "CONFIG_MISSING",
      "TWILIO_AUTH_TOKEN nao configurada.",
      503
    );
  }

  if (!process.env.TWILIO_WHATSAPP_FROM) {
    throw new OtpSendError(
      "CONFIG_MISSING",
      "TWILIO_WHATSAPP_FROM nao configurada.",
      503
    );
  }
}

function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, "").replace(/[()\-]/g, "");
}

export async function sendOtpToWhatsapp(phone: string, code: string) {
  ensureTwilioConfig();

  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) {
    throw new OtpSendError(
      "CONFIG_MISSING",
      "TWILIO_WHATSAPP_FROM nao configurada.",
      503
    );
  }

  const normalizedPhone = normalizePhone(phone);
  const to = normalizedPhone.startsWith("whatsapp:")
    ? normalizedPhone
    : `whatsapp:${normalizedPhone}`;

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const body = new URLSearchParams({
    From: from,
    To: to,
    Body: `Seu codigo Conecta Advogados: ${code}`,
  });

  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString(
    "base64"
  );

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const rawText = await response.text();
    let payload: TwilioMessageResponse | undefined;

    try {
      payload = rawText ? (JSON.parse(rawText) as TwilioMessageResponse) : undefined;
    } catch {
      payload = undefined;
    }

    if (!response.ok) {
      const providerMessage = payload?.message ?? `HTTP ${response.status}`;

      throw new OtpSendError(
        "PROVIDER_REJECTED",
        "Twilio rejeitou o envio do OTP.",
        response.status === 429 ? 429 : 502,
        providerMessage
      );
    }

    if (!payload?.sid) {
      throw new OtpSendError(
        "UNKNOWN",
        "Twilio nao retornou SID da mensagem.",
        502
      );
    }

    return {
      sid: payload.sid,
      to,
    };
  } catch (error) {
    if (error instanceof OtpSendError) {
      throw error;
    }

    throw new OtpSendError(
      "NETWORK_FAILURE",
      "Falha de rede ao enviar OTP via Twilio.",
      502
    );
  }
}

export function saveOtp(phone: string, code: string) {
  otpStore.set(phone, {
    codeHash: hashOtp(code),
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
}

export function validateOtp(phone: string, code: string) {
  const current = otpStore.get(phone);
  if (!current) return false;
  if (current.expiresAt < Date.now()) {
    otpStore.delete(phone);
    return false;
  }

  const valid = current.codeHash === hashOtp(code);
  if (valid) {
    otpStore.delete(phone);
  }

  return valid;
}
