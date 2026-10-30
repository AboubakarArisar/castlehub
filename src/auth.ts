import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // JWT sessions: a signed, encrypted cookie keyed by AUTH_SECRET, no session table.
  // Expires after 1 hour without activity; renewed at most every 5 minutes while in use.
  // Rotating AUTH_SECRET logs everyone out.
  session: { strategy: "jwt", maxAge: 60 * 60, updateAge: 5 * 60 },
  pages: { signIn: "/signin", error: "/signin" },
  providers: [
    Credentials({
      id: "password",
      name: "Email",
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        const user = await db.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, image: true, passwordHash: true } });
        if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
});
