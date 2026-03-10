import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { isRateLimited, recordFailedAttempt, clearAttempts } from "@/lib/rate-limit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const ip =
          request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
          "unknown";

        if (isRateLimited(ip)) {
          console.warn(`Rate limited login attempt from ${ip}`);
          return null;
        }

        const username = process.env.APP_USERNAME;
        const password = process.env.APP_PASSWORD;

        if (
          credentials?.username === username &&
          credentials?.password === password
        ) {
          clearAttempts(ip);
          return { id: "1", name: username as string };
        }

        recordFailedAttempt(ip);
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
