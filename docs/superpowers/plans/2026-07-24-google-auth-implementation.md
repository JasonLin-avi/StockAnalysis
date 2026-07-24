# Google OAuth 登入與白名單權限限制實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 為 StockAnalysis 系統整合 Next-Auth，利用 Google OAuth 登入並透過 Middleware 進行全站路由攔截，只允許環境變數白名單中的 Google Email 帳戶存取網站。

**Architecture:** 
1. 使用 `next-auth` 建立 API 路由 `/api/auth/[...nextauth]/route.js` 來定義 `GoogleProvider` 與 `signIn` callback。
2. 使用 Next.js Middleware 攔截除靜態檔案與 Auth API 以外的所有流量，並將未登入者直接引導至 `/api/auth/signin/google`。
3. 透過環境變數 `ALLOWED_EMAILS` 動態設定允許的 Email 白名單。

**Tech Stack:** Next.js (14.2.0), Next-Auth (v4), Tailwind CSS, Jest

## Global Constraints
- `ALLOWED_EMAILS` 白名單變數儲存於 `.env.local`，格式為逗號分隔字串。
- `NEXTAUTH_SECRET` 必須設定以加密 Session JWT。
- Google Redirect URI 必須在 Google Console 設為 `http://localhost:3000/api/auth/callback/google`。

---

### Task 1: 安裝相依套件與實作 Next-Auth API 路由

**Files:**
- Create: `src/app/api/auth/[...nextauth]/route.js`
- Create: `tests/unit/auth.test.js`
- Modify: `package.json`

**Interfaces:**
- Consumes: `process.env.GOOGLE_CLIENT_ID`, `process.env.GOOGLE_CLIENT_SECRET`, `process.env.NEXTAUTH_SECRET`, `process.env.ALLOWED_EMAILS`
- Produces: `authOptions` 供 Next-Auth 初始化使用，並導出 `GET` 與 `POST` handlers。

- [ ] **Step 1: 安裝 next-auth 相依套件**

Run: `npm install next-auth`
Expected: 套件成功安裝，且 `package.json` 中已新增 `"next-auth"`。

- [ ] **Step 2: 撰寫 Next-Auth signIn callback 測試**

建立 `tests/unit/auth.test.js` 以驗證白名單機制的正確性：

```javascript
// tests/unit/auth.test.js
describe("Next-Auth White-list signIn Callback", () => {
  let authOptions;

  beforeEach(() => {
    jest.resetModules();
    process.env.ALLOWED_EMAILS = "avilin@gmail.com,test@example.com";
    // 延遲載入以取得重設後的環境變數
    authOptions = require("../../src/app/api/auth/[...nextauth]/route").authOptions;
  });

  afterEach(() => {
    delete process.env.ALLOWED_EMAILS;
  });

  test("should allow sign in for emails on the white list", async () => {
    const profile = { email: "avilin@gmail.com" };
    const result = await authOptions.callbacks.signIn({ profile });
    expect(result).toBe(true);
  });

  test("should reject sign in for emails NOT on the white list", async () => {
    const profile = { email: "hacker@gmail.com" };
    const result = await authOptions.callbacks.signIn({ profile });
    expect(result).toBe(false);
  });

  test("should reject sign in if profile email is missing", async () => {
    const profile = {};
    const result = await authOptions.callbacks.signIn({ profile });
    expect(result).toBe(false);
  });
});
```

- [ ] **Step 3: 執行測試以確保其失敗**

Run: `npx jest tests/unit/auth.test.js`
Expected: 測試失敗，並提示找不到 `../../src/app/api/auth/[...nextauth]/route` 模組。

- [ ] **Step 4: 建立並實作 Next-Auth API 路由與設定**

建立 `src/app/api/auth/[...nextauth]/route.js`：

```javascript
// src/app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "dummy-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy-client-secret",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || "dummy-secret",
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ profile }) {
      const allowedEmails = process.env.ALLOWED_EMAILS?.split(",") || [];
      if (profile?.email && allowedEmails.includes(profile.email)) {
        return true;
      }
      return false;
    },
    async jwt({ token }) {
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = token.email;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

- [ ] **Step 5: 重新執行測試以驗證其通過**

Run: `npx jest tests/unit/auth.test.js`
Expected: 3 個測試全部通過。

- [ ] **Step 6: 將變更 Commit 到 Git**

```bash
git add package.json package-lock.json tests/unit/auth.test.js src/app/api/auth/[...nextauth]/route.js
git commit -m "feat: install next-auth and implement Google auth options with white-list filtering"
```

---

### Task 2: 實作全站防護與直接跳轉的 Middleware

**Files:**
- Create: `src/middleware.js`
- Create: `tests/unit/middleware.test.js`

**Interfaces:**
- Consumes: Next-Auth `withAuth` 及 `process.env.ALLOWED_EMAILS`
- Produces: 預設導出的 Next.js Middleware 函數。

- [ ] **Step 1: 撰寫 Middleware 阻擋邏輯測試**

建立 `tests/unit/middleware.test.js` 驗證 Middleware 的攔截與重新導向：

```javascript
// tests/unit/middleware.test.js
import { NextResponse } from "next/server";

// Mock next-auth/middleware 的 withAuth 函數，使其接受我們的自訂參數
jest.mock("next-auth/middleware", () => {
  return {
    withAuth: (middlewareFn, options) => {
      return {
        middlewareFn,
        options,
      };
    },
  };
});

describe("Next-Auth Middleware Routing Guard", () => {
  let middlewareModule;

  beforeEach(() => {
    jest.resetModules();
    process.env.ALLOWED_EMAILS = "avilin@gmail.com";
    middlewareModule = require("../../src/middleware").default;
  });

  afterEach(() => {
    delete process.env.ALLOWED_EMAILS;
  });

  test("should authorize token if email is in the allowed white list", () => {
    const token = { email: "avilin@gmail.com" };
    const authorizedFn = middlewareModule.options.callbacks.authorized;
    expect(authorizedFn({ token })).toBe(true);
  });

  test("should reject token if email is NOT in the allowed list", () => {
    const token = { email: "hacker@gmail.com" };
    const authorizedFn = middlewareModule.options.callbacks.authorized;
    expect(authorizedFn({ token })).toBe(false);
  });

  test("should reject authorization if token does not exist", () => {
    const authorizedFn = middlewareModule.options.callbacks.authorized;
    expect(authorizedFn({ token: null })).toBe(false);
  });

  test("should point signIn page to the direct Google sign-in endpoint", () => {
    expect(middlewareModule.options.pages.signIn).toBe("/api/auth/signin/google");
  });
});
```

- [ ] **Step 2: 執行測試以確保其失敗**

Run: `npx jest tests/unit/middleware.test.js`
Expected: 測試失敗，並提示找不到 `../../src/middleware` 模組。

- [ ] **Step 3: 建立並實作 `src/middleware.js`**

建立 `src/middleware.js` 檔案：

```javascript
// src/middleware.js
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        const allowedEmails = process.env.ALLOWED_EMAILS?.split(",") || [];
        return !!token && allowedEmails.includes(token.email);
      },
    },
    pages: {
      // 當未授權時，直接跳轉到 Google OAuth 起點
      signIn: "/api/auth/signin/google",
    },
  }
);

export const config = {
  // 保護全站所有路由與 API，除了 Next-Auth 本身與靜態資源
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
```

- [ ] **Step 4: 重新執行測試以驗證其通過**

Run: `npx jest tests/unit/middleware.test.js`
Expected: 測試全部通過。

- [ ] **Step 5: 將變更 Commit 到 Git**

```bash
git add src/middleware.js tests/unit/middleware.test.js
git commit -m "feat: implement route guard middleware redirecting to Google Sign-In"
```

---

### Task 3: 本地手動整合測試與驗證

**Files:**
- Modify: `.env.local`

**Interfaces:**
- Consumes: Google Client ID & Secret
- Produces: 正常運行且受驗證保護的本機開發環境。

- [ ] **Step 1: 確保環境變數設定正確**

確認 `D:/Programming/StockAnalysis/.env.local` 檔案中包含：
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `ALLOWED_EMAILS=avilin@gmail.com`
- 額外手動補上 `NEXTAUTH_SECRET=a_secure_random_base64_string` (例如可用 `openssl rand -base64 32` 生成，但在 Windows 可用任何隨機字串代替)。

- [ ] **Step 2: 啟動 Next.js 本地伺服器**

Run: `npm run dev`
Expected: 終端機顯示伺服器運行在 `http://localhost:3000`。

- [ ] **Step 3: 驗證未授權重導向功能**

開啟一個無痕視窗，造訪 `http://localhost:3000/`。
Expected: 瀏覽器地址欄應瞬間跳轉至 `https://accounts.google.com/...`，提示您使用 Google 帳戶登入。

- [ ] **Step 4: 測試白名單登入成功**

使用 `avilin@gmail.com` 登入。
Expected: 登入成功後，應被重導向回 `http://localhost:3000/`，且所有股票分析功能與 API 均正常顯示，無阻礙。

- [ ] **Step 5: 測試非白名單登入攔截**

造訪 `http://localhost:3000/api/auth/signout` 登出。
重新造訪 `http://localhost:3000/` 並使用另一個非 `avilin@gmail.com` 的 Google 帳戶登入。
Expected: 登入後應跳轉至 `/api/auth/error?error=AccessDenied` 錯誤頁面，畫面顯示 Access Denied 警告，且無法存取網站內容。

- [ ] **Step 6: 提交所有剩餘變更並關閉任務**

```bash
git commit -a -m "test: manual verification of OAuth sign-in redirect and white-list check succeeded"
```
