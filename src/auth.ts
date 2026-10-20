import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Credentials from "next-auth/providers/credentials";
import Slack, { type SlackProfile } from "next-auth/providers/slack";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";

// Local-only sign-in for testing: Slack requires an HTTPS redirect URL, so it
// can't complete on http://localhost. Never enabled in production builds.
export const devLoginEnabled =
  process.env.NODE_ENV === "development" && process.env.AUTH_DEV_LOGIN === "1";

const providers: Provider[] = [
  Slack({
    profile(p: SlackProfile) {
      return {
        id: p.sub,
        name: p.name,
        email: p.email,
        image: p["https://slack.com/user_image_192"] ?? p.picture,
        slackTeamId: p["https://slack.com/team_id"],
      };
    },
  }),
];

if (devLoginEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Dev login",
      credentials: { email: { label: "Email", type: "email" } },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return null;
        return db.user.upsert({
          where: { email },
          update: {},
          create: { email, name: email.split("@")[0] },
        });
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // JWT sessions: required by the dev credentials provider, and no session
  // table lookups on every request.
  session: { strategy: "jwt" },
  pages: { signIn: "/signin", error: "/signin" },
  providers,
  callbacks: {
    // Only members of the SkyCastle Slack workspace may sign in.
    signIn({ account, profile }) {
      if (account?.provider !== "slack") return true;
      const allowedTeam = process.env.SLACK_TEAM_ID;
      if (!allowedTeam) return process.env.NODE_ENV !== "production";
      return (profile as SlackProfile | undefined)?.["https://slack.com/team_id"] === allowedTeam;
    },
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
