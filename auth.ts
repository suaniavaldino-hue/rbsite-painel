import { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import {
  assertHttpsInProduction,
  getAuthCookies,
  getAuthSecret,
  getSessionMaxAge,
  shouldUseSecureAuthCookies,
} from "@/lib/auth/env";
import {
  authenticateAdminCredentials,
  getAdminAccount,
} from "@/lib/security/admin-account";
import {
  assertLoginAllowed,
  clearLoginAttempts,
  recordFailedLoginAttempt,
} from "@/lib/security/login-protection";
import {
  consumeEmailLoginChallenge,
  isEmailLoginOtpEnabled,
} from "@/lib/security/email-login";
import { getClientIpAddress, getUserAgent } from "@/lib/security/request";
import { isTokenSessionValid } from "@/lib/security/session-security";
import { logAuditEvent } from "@/lib/security/audit";

assertHttpsInProduction();

function resolveCredentialsValue(
  value: unknown,
  fallback = "",
): string {
  return typeof value === "string" ? value.trim() : fallback;
}

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  session: {
    strategy: "jwt",
    maxAge: getSessionMaxAge(),
  },
  jwt: {
    maxAge: getSessionMaxAge(),
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "RB Site Admin",
      credentials: {
        email: {
          label: "Email",
          type: "email",
          placeholder: "contato@rbsite.com.br",
        },
        password: {
          label: "Senha",
          type: "password",
        },
        otp: {
          label: "Codigo 2FA",
          type: "text",
          placeholder: "123456",
        },
        emailLoginCode: {
          label: "Codigo por email",
          type: "text",
          placeholder: "123456",
        },
        emailChallengeId: {
          label: "Desafio de email",
          type: "text",
        },
        recoveryCode: {
          label: "Codigo de recuperacao",
          type: "text",
          placeholder: "ABCD-EFGH-IJKL",
        },
      },
      async authorize(credentials, req) {
        const email = resolveCredentialsValue(credentials?.email).toLowerCase();
        const password = resolveCredentialsValue(credentials?.password);
        const otp = resolveCredentialsValue(credentials?.otp);
        const emailLoginCode = resolveCredentialsValue(
          credentials?.emailLoginCode,
        );
        const emailChallengeId = resolveCredentialsValue(
          credentials?.emailChallengeId,
        );
        const recoveryCode = resolveCredentialsValue(credentials?.recoveryCode);
        const ipAddress = getClientIpAddress(req?.headers);
        const userAgent = getUserAgent(req?.headers);

        if (!email || !password) {
          return null;
        }

        try {
          await assertLoginAllowed(email, ipAddress);
        } catch (error) {
          await logAuditEvent({
            event: "auth.login_rate_limited",
            level: "warn",
            actor: { email, ipAddress, userAgent },
            message:
              error instanceof Error
                ? error.message
                : "Login rate limited.",
          });
          throw error;
        }

        const authenticatedAdmin = await authenticateAdminCredentials({
          email,
          password,
          otp,
          recoveryCode,
        });

        if (!authenticatedAdmin) {
          await recordFailedLoginAttempt(email, ipAddress);
          await logAuditEvent({
            event: "auth.login_failed",
            level: "warn",
            actor: { email, ipAddress, userAgent },
            message: "Falha de autenticacao administrativa.",
          });
          return null;
        }

        if (isEmailLoginOtpEnabled()) {
          const emailCodeValid =
            emailLoginCode &&
            emailChallengeId &&
            (await consumeEmailLoginChallenge({
              email,
              challengeId: emailChallengeId,
              code: emailLoginCode,
            }));

          if (!emailCodeValid) {
            await recordFailedLoginAttempt(email, ipAddress);
            await logAuditEvent({
              event: "auth.login_email_code_failed",
              level: "warn",
              actor: { email, ipAddress, userAgent },
              message: "Codigo de confirmacao por email invalido ou expirado.",
            });
            return null;
          }
        }

        await clearLoginAttempts(email, ipAddress);

        return {
          id: authenticatedAdmin.id,
          name: authenticatedAdmin.name,
          email: authenticatedAdmin.email,
          role: authenticatedAdmin.role,
          sessionVersion: authenticatedAdmin.sessionVersion,
          twoFactorPassed: authenticatedAdmin.twoFactorEnabled
            ? authenticatedAdmin.twoFactorPassed
            : true,
          authenticationMethod: authenticatedAdmin.authenticationMethod,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
        token.sessionVersion = user.sessionVersion;
        token.twoFactorPassed = user.twoFactorPassed;
        token.authenticationMethod = user.authenticationMethod;
      }

      if (!(await isTokenSessionValid(token))) {
        return {};
      }

      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: token.sub ?? "",
        name: token.name ?? session.user?.name ?? null,
        email: token.email ?? session.user?.email ?? null,
        role: token.role === "admin" ? "admin" : undefined,
        sessionVersion:
          typeof token.sessionVersion === "number"
            ? token.sessionVersion
            : undefined,
        twoFactorPassed: token.twoFactorPassed === true,
        authenticationMethod:
          typeof token.authenticationMethod === "string"
            ? token.authenticationMethod
            : undefined,
      };

      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/") && !url.startsWith("//")) {
        return `${baseUrl}${url}`;
      }

      try {
        const parsedUrl = new URL(url);

        if (parsedUrl.origin === baseUrl) {
          return url;
        }
      } catch {
        return baseUrl;
      }

      return baseUrl;
    },
  },
  events: {
    async signIn(message) {
      const admin = await getAdminAccount();
      const email =
        message.user?.email ?? message.account?.providerAccountId ?? admin.email;

      await logAuditEvent({
        event: "auth.login_success",
        actor: {
          id: message.user?.id,
          email,
          role: "admin",
        },
        message: "Login administrativo concluido com sucesso.",
      });
    },
    async signOut(message) {
      const email =
        typeof message.token?.email === "string"
          ? message.token.email
          : undefined;

      await logAuditEvent({
        event: "auth.logout",
        actor: {
          email,
          role: "admin",
        },
        message: "Sessao administrativa encerrada.",
      });
    },
  },
  useSecureCookies: shouldUseSecureAuthCookies(),
  cookies: getAuthCookies(),
};

export function auth() {
  return getServerSession(authOptions);
}
