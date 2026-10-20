"use server";

import { db } from "@/lib/db";
import { requireViewer } from "@/lib/session";

export async function markNotificationsRead() {
  const viewer = await requireViewer();
  await db.notification.updateMany({ where: { userId: viewer.id, readAt: null }, data: { readAt: new Date() } });
}
