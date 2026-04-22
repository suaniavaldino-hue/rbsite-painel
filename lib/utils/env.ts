const fallbackUrl = "http://localhost:3000";

export const env = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "RB Site Social Automation",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? fallbackUrl,
  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME ?? "RB Site",
  companySite: process.env.NEXT_PUBLIC_COMPANY_SITE ?? "https://rbsite.com.br",
  timezone:
    process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE ?? "America/Sao_Paulo",
  canonicalHost: process.env.APP_CANONICAL_HOST ?? "painel.rbsite.com.br",
  isProduction: process.env.NODE_ENV === "production",
};

export function getCanonicalPanelUrl() {
  if (env.canonicalHost.startsWith("http")) {
    return env.canonicalHost;
  }

  return `https://${env.canonicalHost}`;
}
