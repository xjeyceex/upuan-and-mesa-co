import { cookies } from "next/headers";
import { AUTH_COOKIE } from "./constants";

export function getSessionToken(): string {
  return process.env.SESSION_TOKEN ?? "";
}

export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  return Boolean(token && token === getSessionToken());
}

export function verifyPassword(password: string): boolean {
  const expected = process.env.APP_PASSWORD ?? "";
  return expected.length > 0 && password === expected;
}
