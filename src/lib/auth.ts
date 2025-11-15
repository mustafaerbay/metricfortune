import NextAuth, { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { prisma } from "./prisma";

const TOKEN_MAX_AGE_SECONDS = 60 * 60;
export const authOptions = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email as string,
          },
          include: {
            business: true,
          },
        });

        if (!user) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          emailVerified: user.emailVerified,
          businessId: user.business?.id,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt" as const,
    maxAge: TOKEN_MAX_AGE_SECONDS,
  },
  jwt: {
    maxAge: TOKEN_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user }) {
      // Block sign-in if email is not verified
      if (!user.emailVerified) {
        // Use a redirect URL to send user to verify-email page
        // This prevents the AccessDenied error in logs
        return "/verify-email";
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      const now = Math.floor(Date.now() / 1000);
      if (user) {
        token.id = user.id;
        token.emailVerified = user.emailVerified;
        token.businessId = user.businessId;
        token.sessionStartedAt = token.sessionStartedAt || Date.now();
      }
      if (
        token.sessionStartedAt &&
        now - (token.sessionStartedAt as number) > TOKEN_MAX_AGE_SECONDS
      ) {
        // Returning an empty token makes session() return null (see below)
        return {} as typeof token;
      }
      // Refresh user data on update trigger (e.g., after email verification or profile completion)
      if (trigger === "update" && token.id) {
        const updatedUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: { business: true },
        });
        if (updatedUser) {
          token.emailVerified = updatedUser.emailVerified;
          token.businessId = updatedUser.business?.id;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (!token || !token.id) {
        // If there's no user ID in the token, return the original session (must not be null)
        return session;
      }
      if (session.user) {
        session.user.id = token.id as string;
        session.user.emailVerified = token.emailVerified as boolean;
        session.user.businessId = token.businessId as string | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
