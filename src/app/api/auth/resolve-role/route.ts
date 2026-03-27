import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth/requireAppUser";

export async function GET() {
  const auth = await requireAppUser();
  if (!auth.ok) {
    return auth.response;
  }

  return NextResponse.json({
    success: true,
    role: auth.user.role,
  });
}
