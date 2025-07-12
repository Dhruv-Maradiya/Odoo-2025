import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // If user is admin and trying to access home page, redirect to admin dashboard
    if (token?.role === "admin" && pathname === "/") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // If user is not admin and trying to access admin routes, redirect to home
    if (pathname.startsWith("/admin") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow access to public routes
        if (
          pathname.startsWith("/auth") ||
          pathname === "/" ||
          pathname.startsWith("/question")
        ) {
          return true;
        }

        // Require authentication for protected routes
        if (
          pathname.startsWith("/admin") ||
          pathname.startsWith("/ask") ||
          pathname.startsWith("/notifications") ||
          pathname.startsWith("/profile")
        ) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
