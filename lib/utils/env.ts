function normalizeRuntimeUrl(value?: string) {
  const normalized = value?.trim().replace(/\/$/, "");
  return normalized ? normalized : undefined;
}

function buildHttpsUrlFromHost(host?: string) {
  const normalizedHost = host?.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");

  if (!normalizedHost) {
    return undefined;
  }

  return `https://${normalizedHost}`;
}

function resolveAppUrl() {
  const explicitUrl =
    normalizeRuntimeUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeRuntimeUrl(process.env.NEXTAUTH_URL);

  if (explicitUrl) {
    return explicitUrl;
  }

  const vercelRuntimeUrl =
    buildHttpsUrlFromHost(process.env.VERCEL_URL) ??
    buildHttpsUrlFromHost(process.env.VERCEL_BRANCH_URL) ??
    buildHttpsUrlFromHost(process.env.VERCEL_PROJECT_PRODUCTION_URL);

  if (vercelRuntimeUrl) {
    return vercelRuntimeUrl;
  }

  return "http://localhost:3000";
}

function resolveCanonicalHost() {
  const explicitHost = process.env.APP_CANONICAL_HOST?.trim();

  if (explicitHost) {
    return explicitHost.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }

  return (
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "painel.rbsite.com.br"
  );
}

export const env = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "RB Site Social Automation",
  appUrl: resolveAppUrl(),
  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME ?? "RB Site",
  companySite: process.env.NEXT_PUBLIC_COMPANY_SITE ?? "https://rbsite.com.br",
  timezone:
    process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE ?? "America/Sao_Paulo",
  canonicalHost: resolveCanonicalHost(),
  isProduction: process.env.NODE_ENV === "production",
};

export function getCanonicalPanelUrl() {
  if (env.canonicalHost.startsWith("http")) {
    return env.canonicalHost;
  }

  return `https://${env.canonicalHost}`;
}
