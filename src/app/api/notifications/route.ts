import { NextResponse } from "next/server";
import { getUnreadCount } from "@/lib/queries";
import { getViewer } from "@/lib/session";

// Polled by the bell about once a minute; one indexed count query.
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ unread: 0 }, { status: 401 });
  return NextResponse.json({ unread: await getUnreadCount(viewer.id) }, { headers: { "cache-control": "no-store" } });
}
