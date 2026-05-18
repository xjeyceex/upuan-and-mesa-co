import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/constants";
import { getSessionToken, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const password = typeof body.password === "string" ? body.password : "";

  if (!verifyPassword(password)) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const session = getSessionToken();
  if (!session) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, session, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
