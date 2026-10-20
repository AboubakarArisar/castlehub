"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { fieldErrors, handleSchema, profileSchema } from "@/lib/rules";
import { requireViewer } from "@/lib/session";
import { isOwnUpload } from "@/lib/storage";

export type FormState = { errors?: Record<string, string>; ok?: boolean };

export async function claimHandle(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  if (viewer.handle) redirect("/feed");

  const handle = handleSchema.safeParse(formData.get("handle"));
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (!handle.success) return { errors: { handle: handle.error.issues[0].message } };
  if (!name) return { errors: { name: "Add your name" } };

  try {
    await db.user.update({ where: { id: viewer.id }, data: { handle: handle.data, name } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { errors: { handle: "That handle is taken" } };
    throw e;
  }
  redirect("/feed");
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await requireViewer();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    headline: formData.get("headline") ?? undefined,
    bio: formData.get("bio") ?? undefined,
    website: formData.get("website") ?? "",
    skills: formData.get("skills") ?? "",
    image: formData.get("image") ?? undefined,
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const { image, ...rest } = parsed.data;
  // Keep the current avatar (e.g. the Slack photo) unless a new upload replaced it.
  const data = image && image !== viewer.image ? (isOwnUpload(image) ? { ...rest, image } : null) : rest;
  if (!data) return { errors: { image: "Upload the image again" } };

  await db.user.update({ where: { id: viewer.id }, data });
  revalidatePath("/", "layout");
  return { ok: true };
}
