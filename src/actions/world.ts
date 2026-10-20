"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCity, getCountry, placeFor, type Place } from "@/lib/places";
import { requireBuilder, requireViewer } from "@/lib/session";

export type WorldState = { errors?: Record<string, string>; ok?: boolean; place?: Place | null; onMap?: boolean };

/** Save the builder's own country/city and map visibility. Only ids from our place list are accepted. */
export async function setWorldLocation(_prev: WorldState, formData: FormData): Promise<WorldState> {
  const viewer = await requireBuilder();
  const countryCode = String(formData.get("countryCode") ?? "").trim().toUpperCase();
  const cityRaw = String(formData.get("cityId") ?? "").trim();
  const onWorldMap = formData.get("onWorldMap") === "on";

  const country = getCountry(countryCode);
  if (!country) return { errors: { countryCode: "Pick your country from the list" } };
  const cityId = cityRaw ? Number(cityRaw) : null;
  if (cityId !== null && getCity(cityId)?.cc !== country.code) return { errors: { cityId: "Pick a city from the suggestions, or leave it empty" } };

  await db.user.update({ where: { id: viewer.id }, data: { countryCode: country.code, cityId, onWorldMap } });
  revalidatePath("/world");
  revalidatePath(`/${viewer.handle}`);
  return { ok: true, place: placeFor(country.code, cityId), onMap: onWorldMap };
}

/** Remove the flag: clears the location entirely. Works even for suspended accounts (it only removes data). */
export async function removeWorldLocation() {
  const viewer = await requireViewer();
  await db.user.update({ where: { id: viewer.id }, data: { countryCode: null, cityId: null, onWorldMap: false } });
  revalidatePath("/world");
  if (viewer.handle) revalidatePath(`/${viewer.handle}`);
}
