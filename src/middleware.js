// src/middleware.js
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// 包裹 Next-Auth withAuth Middleware 實作全站路由保護
// 設定白名單驗證邏輯與未授權時的直接 Google OAuth 跳轉
export default withAuth(
  function middleware(req) {
    // 授權通過後繼續處理請求
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // 讀取環境變數 ALLOWED_EMAILS 並檢查使用者 Email 是否在白名單內
        // 防止未授權的 Google 帳號存取系統
        const allowedEmails = process.env.ALLOWED_EMAILS?.split(",") || [];
        return !!token && allowedEmails.includes(token.email);
      },
    },
    pages: {
      // 當使用者未通過授權時，跳過預設 Next-Auth 登入頁面，直接導向 Google OAuth 發起點
      signIn: "/api/auth/signin/google",
    },
  }
);

export const config = {
  // 保護全站所有頁面與 API，但排除 OAuth 驗證端點 (api/auth) 與前端靜態資源，避免無窮重導向
  matcher: [
    "/((?!api/auth|api/chat|_next/static|_next/image|favicon.ico).*)",
  ],
};
