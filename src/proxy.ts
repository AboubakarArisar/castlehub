import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Signed-out visitors to members-only pages go to /signin and come back after.
// Pages and actions still check access themselves (src/lib/session.ts); this only redirects.
export default auth((req) => {
  if (req.auth) return;
  const url = new URL("/signin", req.url);
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
});

export const config = {
  matcher: ["/settings", "/notifications", "/onboarding", "/projects/new", "/admin/:path*", "/castle-wall/edit", "/:handle/:slug/edit"],
};
