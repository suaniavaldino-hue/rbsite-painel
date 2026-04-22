import { TwoFactorCard } from "@/components/security/two-factor-card";
import { createCsrfToken } from "@/lib/security/csrf";
import { readSecurityState } from "@/lib/security/store";
import { buildOtpAuthUri } from "@/lib/security/two-factor";

export const dynamic = "force-dynamic";

export default async function SecuritySettingsPage() {
  const securityState = await readSecurityState();
  const pendingSetup = securityState.admin.pendingTwoFactorSetup;

  return (
    <div className="grid gap-6">
      <section className="surface-card rounded-[32px] p-6 md:p-8">
        <span className="inline-flex rounded-full border border-emerald-300/18 bg-emerald-300/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-200">
          Centro de seguranca
        </span>

        <h1 className="mt-5 font-display text-3xl font-semibold tracking-[-0.05em] text-white md:text-4xl">
          Configure 2FA, codigos de emergencia e fluxos sensiveis com auditoria.
        </h1>

        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
          As acoes abaixo usam Server Actions autorizadas no backend, validacao de
          CSRF, auditoria e verificacao explicita de sessao administrativa.
        </p>
      </section>

      <TwoFactorCard
        enabled={securityState.admin.twoFactorEnabled}
        pendingSecret={pendingSetup?.secret}
        pendingOtpAuthUrl={
          pendingSetup
            ? buildOtpAuthUri({
                issuer: "RB Site Social Automation",
                accountName: securityState.admin.email,
                secret: pendingSetup.secret,
              })
            : undefined
        }
        startCsrfToken={createCsrfToken("2fa-start")}
        confirmCsrfToken={createCsrfToken("2fa-confirm")}
        recoveryCsrfToken={createCsrfToken("2fa-recovery-regenerate")}
      />
    </div>
  );
}
