"use server";

import { cookies } from "next/headers";

export async function setTokenCookie(name: string, value: string) {
  const cookieStore = await cookies();
  cookieStore.set(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
}

export async function getTokenCookie(name: string) {
  const cookieStore = await cookies();
  return cookieStore.get(name)?.value || null;
}

export async function removeTokenCookie(name: string) {
  const cookieStore = await cookies();
  cookieStore.delete(name);
}
