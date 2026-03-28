import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const OTP_EXPIRATION_MINUTES = 5;
const OTP_RATE_LIMIT_WINDOW_MINUTES = 15;
const OTP_RATE_LIMIT_MAX_REQUESTS = 3;

export class OtpSendError extends Error {
  readonly reason:
    | "CONFIG_MISSING"
    | "RATE_LIMITED"
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

type OtpSessionRow = {
  id: string;
  code_hash: string;
  expires_at: string;
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

function getSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

  if (!url || !serviceRoleKey) {
    throw new OtpSendError(
      "CONFIG_MISSING",
      "Supabase nao configurado para persistencia de OTP.",
      503
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function enforceOtpRateLimit(phone: string, requesterIp?: string) {
  const supabase = getSupabaseServiceClient();
  const normalizedPhone = normalizePhone(phone);
  const threshold = new Date(Date.now() - OTP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count: phoneCount, error: phoneError } = await supabase
    .from("otp_sessions")
    .select("id", { count: "exact", head: true })
    .eq("phone", normalizedPhone)
    .gte("created_at", threshold);

  if (phoneError) {
    throw new OtpSendError(
      "UNKNOWN",
      "Falha ao verificar limite de envio OTP por telefone.",
      500,
      phoneError.message
    );
  }

  if ((phoneCount ?? 0) >= OTP_RATE_LIMIT_MAX_REQUESTS) {
    throw new OtpSendError(
      "RATE_LIMITED",
      "Voce atingiu o limite de envio de codigo. Tente novamente em alguns minutos.",
      429
    );
  }

  if (!requesterIp) {
    return;
  }

  const { count: ipCount, error: ipError } = await supabase
    .from("otp_sessions")
    .select("id", { count: "exact", head: true })
    .eq("requester_ip", requesterIp)
    .gte("created_at", threshold);

  if (ipError) {
    throw new OtpSendError(
      "UNKNOWN",
      "Falha ao verificar limite de envio OTP por IP.",
      500,
      ipError.message
    );
  }

  if ((ipCount ?? 0) >= OTP_RATE_LIMIT_MAX_REQUESTS * 3) {
    throw new OtpSendError(
      "RATE_LIMITED",
      "Muitas solicitacoes de OTP deste IP. Aguarde alguns minutos para tentar novamente.",
      429
    );
  }
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

export async function saveOtp(phone: string, code: string, requesterIp?: string) {
  const supabase = getSupabaseServiceClient();
  const normalizedPhone = normalizePhone(phone);

  const payload = {
    phone: normalizedPhone,
    code_hash: hashOtp(code),
    expires_at: new Date(Date.now() + OTP_EXPIRATION_MINUTES * 60 * 1000).toISOString(),
    requester_ip: requesterIp ?? null,
  };

  const { error } = await supabase.from("otp_sessions").insert(payload);
  if (error) {
    throw new OtpSendError(
      "UNKNOWN",
      "Falha ao persistir OTP para validacao.",
      500,
      error.message
    );
  }
}

export async function validateOtp(phone: string, code: string) {
  const supabase = getSupabaseServiceClient();
  const normalizedPhone = normalizePhone(phone);
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("otp_sessions")
    .select("id, code_hash, expires_at")
    .eq("phone", normalizedPhone)
    .is("consumed_at", null)
    .gte("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .returns<OtpSessionRow[]>();

  if (error || !data || data.length === 0) {
    return false;
  }

  const current = data[0];
  const valid = current.code_hash === hashOtp(code);
  if (!valid) {
    return false;
  }

  const { error: consumeError } = await supabase
    .from("otp_sessions")
    .update({ consumed_at: nowIso })
    .eq("id", current.id);

  if (consumeError) {
    return false;
  }

  return true;
}
