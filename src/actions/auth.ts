"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { normalizeAnswer, SECURITY_QUESTIONS } from "@/lib/rules";

export type AuthState = { error?: string };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function read(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };
}

// signIn redirects by throwing, so only Auth.js errors are caught here.
async function passwordSignIn(email: string, password: string, redirectTo: string): Promise<AuthState> {
  try {
    await signIn("password", { email, password, redirectTo });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Wrong email or password." };
    throw e;
  }
  return {};
}

export async function logIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = read(formData);
  return passwordSignIn(email, password, "/feed");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = read(formData);
  if (!EMAIL.test(email) || email.length > 254) return { error: "Enter a valid email." };
  if (password.length < 8 || password.length > 200) return { error: "Use a password of at least 8 characters." };
  const question = String(formData.get("question") ?? "");
  const answer = normalizeAnswer(String(formData.get("answer") ?? ""));
  if (!SECURITY_QUESTIONS.includes(question)) return { error: "Pick a security question." };
  if (answer.length < 2 || answer.length > 100) return { error: "Answer your security question (2–100 characters)." };

  try {
    await db.user.create({
      data: {
        email, name: email.split("@")[0], passwordHash: await hashPassword(password),
        securityQuestion: question, securityAnswerHash: await hashPassword(answer),
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { error: "That email already has an account. Log in instead." };
    throw e;
  }
  // New accounts pick a handle next; /feed would bounce there anyway.
  return passwordSignIn(email, password, "/onboarding");
}

export type ResetState = AuthState & { email?: string; question?: string };

const MAX_FAILURES = 5;
const LOCK_MS = 60 * 60 * 1000;

/** Two steps: an email alone returns its question; email + answer + new password resets and signs in. */
export async function resetPassword(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const { email, password } = read(formData);
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, securityQuestion: true, securityAnswerHash: true, resetFailures: true, resetLockedUntil: true },
  });
  if (!user?.securityQuestion || !user.securityAnswerHash)
    return { error: "No account with that email has a security question. Ask an admin to help." };
  const step2 = { email, question: user.securityQuestion };
  if (!formData.has("answer")) return step2;

  if (user.resetLockedUntil && user.resetLockedUntil > new Date())
    return { ...step2, error: "Too many wrong answers. Try again in an hour." };
  if (password.length < 8 || password.length > 200) return { ...step2, error: "Use a password of at least 8 characters." };

  if (!(await verifyPassword(normalizeAnswer(String(formData.get("answer"))), user.securityAnswerHash))) {
    // An expired lock starts a fresh count.
    const failures = (user.resetLockedUntil ? 0 : user.resetFailures) + 1;
    const locked = failures >= MAX_FAILURES;
    await db.user.update({
      where: { id: user.id },
      data: { resetFailures: locked ? 0 : failures, resetLockedUntil: locked ? new Date(Date.now() + LOCK_MS) : null },
    });
    return { ...step2, error: locked ? "Too many wrong answers. Try again in an hour." : "That answer doesn't match." };
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), resetFailures: 0, resetLockedUntil: null },
  });
  return { ...step2, ...(await passwordSignIn(email, password, "/feed")) };
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
