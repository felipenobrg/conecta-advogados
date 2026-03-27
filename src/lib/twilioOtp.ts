import crypto from "node:crypto";

const otpStore = new Map<string, { codeHash: string; expiresAt: number }>();

export function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function hashOtp(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function sendOtpToWhatsapp(phone: string, code: string) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_FROM) {
    return;
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const body = new URLSearchParams({
    From: process.env.TWILIO_WHATSAPP_FROM,
    To: `whatsapp:${phone}`,
    Body: `Seu codigo Conecta Advogados: ${code}`,
  });

  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString(
    "base64"
  );

  await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
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
