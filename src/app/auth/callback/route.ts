import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { prisma } from "@/lib/db/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AppRole = "LAWYER" | "CLIENT" | "ADMIN";

function redirectPathForRole(role: AppRole) {
  if (role === "ADMIN") return "/admin";
  if (role === "LAWYER") return "/dashboard";
  return "/leads/inscricao";
}

function redirectWithMessage(request: Request, message: string) {
  const url = new URL("/auth", request.url);
  url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const nextPath = requestUrl.searchParams.get("next");

  const supabase = await createSupabaseServerClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return redirectWithMessage(request, "Link de acesso expirado ou invalido.");
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });

    if (error) {
      return redirectWithMessage(request, "Nao foi possivel validar seu magic link.");
    }
  } else {
    return redirectWithMessage(request, "Link de autenticacao incompleto.");
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) {
    return redirectWithMessage(request, "Sessao nao encontrada apos autenticacao.");
  }

  const appUser = await prisma.user.findUnique({
    where: { email: data.user.email },
    select: { role: true },
  });

  if (!appUser) {
    const onboardingUrl = new URL("/onboarding", request.url);
    onboardingUrl.searchParams.set("role", "LAWYER");
    onboardingUrl.searchParams.set("email", data.user.email);
    return NextResponse.redirect(onboardingUrl);
  }

  const destinationPath = nextPath && nextPath.startsWith("/") ? nextPath : redirectPathForRole(appUser.role);
  const destination = new URL(destinationPath, request.url);
  const response = NextResponse.redirect(destination);
  response.cookies.set("app_role", appUser.role, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });

  return response;
}
