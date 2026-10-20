"use server";

import { devLoginEnabled, signIn, signOut } from "@/auth";

export async function signInWithSlack(formData: FormData) {
  const next = String(formData.get("next") ?? "/feed");
  await signIn("slack", { redirectTo: next.startsWith("/") ? next : "/feed" });
}

export async function devSignIn(formData: FormData) {
  if (!devLoginEnabled) throw new Error("Dev login is disabled.");
  await signIn("dev", { email: String(formData.get("email") ?? ""), redirectTo: "/feed" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
