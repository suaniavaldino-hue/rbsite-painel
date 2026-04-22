import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role?: "admin";
      sessionVersion?: number;
      twoFactorPassed?: boolean;
      authenticationMethod?: string;
    };
  }

  interface User {
    id: string;
    role?: "admin";
    sessionVersion?: number;
    twoFactorPassed?: boolean;
    authenticationMethod?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "admin";
    sessionVersion?: number;
    twoFactorPassed?: boolean;
    authenticationMethod?: string;
  }
}
