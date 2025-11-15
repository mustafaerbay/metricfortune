import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      emailVerified: boolean;
      businessId?: string;
    } & DefaultSession["user"];
    expiresAt?: string;
  }

  interface User {
    id: string;
    email: string;
    emailVerified: boolean;
    businessId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    emailVerified: boolean;
    businessId?: string;
    sessionStartedAt?: number;
  }
}
