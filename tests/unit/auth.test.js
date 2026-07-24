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
