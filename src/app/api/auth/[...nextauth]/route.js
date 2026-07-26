import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Why: Under "type": "module", CJS interop wraps default exports in an object with a .default property during Next.js server build.
const NextAuthHandler = NextAuth.default || NextAuth;
const GoogleProviderHandler = GoogleProvider.default || GoogleProvider;

export const authOptions = {
  providers: [
    GoogleProviderHandler({
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

const handler = NextAuthHandler(authOptions);
export { handler as GET, handler as POST };
