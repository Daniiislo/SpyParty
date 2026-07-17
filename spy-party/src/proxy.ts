import { clerkMiddleware } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

const handleI18nRouting = createMiddleware(routing);

// Compose Clerk auth with next-intl locale routing in a single proxy (Next 16
// renamed middleware → proxy). Clerk wraps everything so auth context is always
// attached; next-intl handles locale detection/redirects for page routes only.
export default clerkMiddleware((auth, req) => {
  const { pathname } = req.nextUrl;

  // API, tRPC, and Clerk internal routes must NOT be locale-prefixed. Match those
  // roots and their subpaths only (not siblings like /apixyz). Returning undefined
  // lets the request continue with only Clerk's handling.
  if (/^\/(?:api|trpc|__clerk)(?:\/|$)/.test(pathname)) {
    return;
  }

  // Everything else: redirect "/" → "/{locale}", rewrite locale-prefixed paths,
  // and set the locale cookie.
  return handleI18nRouting(req);
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Always run for Clerk-specific frontend API routes
    "/__clerk/(.*)",
  ],
};
