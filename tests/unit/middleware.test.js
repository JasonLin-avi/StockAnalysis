// tests/unit/middleware.test.js
import { NextResponse } from "next/server";

// 為驗證 withAuth 的參數配置與授權 callback，Mock next-auth/middleware
// 讓 withAuth 返回傳入的 middleware 函數與 options 供測試斷言
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
    // 每個測試前重設模組與環境變數，確保白名單測試間的隔離性
    jest.resetModules();
    process.env.ALLOWED_EMAILS = "avilin@gmail.com";
    middlewareModule = require("../../src/middleware").default;
  });

  afterEach(() => {
    // 清理環境變數避免影響後續其他測試
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
