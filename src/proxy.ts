import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth(async function proxy(request: NextRequest) {
  const session = await auth();
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/signup"];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  // Allow public routes and API routes
  if (isPublicRoute || pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname === "/") {
    return NextResponse.next();
  }

  // Redirect unauthenticated users trying to access protected routes
  if (!session?.user && pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check email verification for certain routes
  if (session?.user && !session.user.emailVerified) {
    const emailVerificationRequired = ["/complete-profile", "/install-tracking", "/dashboard"];
    const needsVerification = emailVerificationRequired.some((route) => pathname.startsWith(route));

    if (needsVerification && pathname !== "/verify-email") {
      return NextResponse.redirect(new URL("/verify-email", request.url));
    }
  }

  // Redirect verified users away from auth pages to dashboard
  if (session?.user?.emailVerified && session.user.businessId) {
    const authPages = ["/login", "/signup", "/verify-email", "/complete-profile"];
    if (authPages.some((page) => pathname === page)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Redirect verified users without complete profile to complete-profile page
  if (session?.user?.emailVerified && !session.user.businessId && pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/complete-profile", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - tracking.js (tracking script)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|tracking.js).*)",
  ],
};
