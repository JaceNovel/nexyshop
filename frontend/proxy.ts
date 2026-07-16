import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { isEsportPath, UI_FEATURES } from "@/lib/ui-feature-flags";

export default clerkMiddleware((_auth, request) => {
  if (!UI_FEATURES.esports && isEsportPath(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/__clerk/(.*)",
    "/(api|trpc)(.*)"
  ]
};
