// src/middleware.js
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// 包裹 Next-Auth withAuth Middleware 實作全站路由保護
// 設定白名單驗證邏輯與未授權時的直接 Google OAuth 跳轉
export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req?.nextUrl?.pathname;
        // Allow public access to backtest api endpoints
        if (path && path.startsWith('/api/backtest')) {
          return true;
        }
        const allowedEmails = process.env.ALLOWED_EMAILS?.split(",") || [];
        // If ALLOWED_EMAILS is not set, allow authenticated user, otherwise check list
        if (allowedEmails.length === 0) return !!token;
        return !!token && allowedEmails.includes(token.email);
      },
    },
    pages: {
      signIn: "/api/auth/signin/google",
    },
  }
);

export const config = {
  matcher: [
    "/((?!api/auth|api/chat|_next/static|_next/image|favicon.ico).*)",
  ],
};
