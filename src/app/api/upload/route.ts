import { NextResponse } from "next/server";
import { getViewer } from "@/lib/session";
import { saveImage, UploadError } from "@/lib/storage";

// One image per request keeps every upload under Vercel's 4.5 MB body limit.
export async function POST(request: Request) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in to upload." }, { status: 401 });
  if (viewer.suspendedAt) return NextResponse.json({ error: "Your account is suspended." }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });

  try {
    const url = await saveImage(file, viewer.id);
    return NextResponse.json({ url });
  } catch (e) {
    if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
