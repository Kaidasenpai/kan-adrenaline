import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { env } from "next-runtime-env";
import { useState } from "react";

import { authClient } from "@kan/auth/client";

import AuthBrandShell from "~/components/AuthBrandShell";
import { Auth } from "~/components/AuthForm";
import { PageHead } from "~/components/PageHead";

export default function LoginPage() {
  const router = useRouter();
  const isSignUpDisabled = env("NEXT_PUBLIC_DISABLE_SIGN_UP") === "true";
  const [isMagicLinkSent, setIsMagicLinkSent] = useState<boolean>(false);
  const [magicLinkRecipient, setMagicLinkRecipient] = useState<string>("");

  const redirect = useSearchParams().get("next");

  const handleMagicLinkSent = (value: boolean, recipient: string) => {
    setIsMagicLinkSent(value);
    setMagicLinkRecipient(recipient);
  };

  const { data } = authClient.useSession();

  if (data?.user.id) router.push(redirect ?? "/boards");

  return (
    <>
      <PageHead title={t`Login | Adrenaline Tasks`} />
      <AuthBrandShell>
        <div className="flex w-full flex-col">
          <h1 className="mb-3 text-3xl font-semibold tracking-[-0.035em] text-light-1000 dark:text-dark-1000">
            {isMagicLinkSent ? t`Check your inbox` : t`Welcome back`}
          </h1>
          {!isMagicLinkSent && (
            <p className="mb-8 text-sm text-light-950 dark:text-dark-950">{t`Sign in to your workspace.`}</p>
          )}
          {isMagicLinkSent ? (
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
              <p className="text-md mt-2 text-center text-light-1000 dark:text-dark-1000">
                <Trans>
                  Click on the link we've sent to {magicLinkRecipient} to sign
                  in.
                </Trans>
              </p>
            </div>
          ) : (
            <div className="w-full">
              <div className="w-full">
                <Auth setIsMagicLinkSent={handleMagicLinkSent} />
              </div>
            </div>
          )}
          {isSignUpDisabled && !redirect?.startsWith("/invite/") && (
            <p className="mt-6 text-center text-xs text-light-900 dark:text-dark-900">{t`Invite-only workspace`}</p>
          )}
          {(!isSignUpDisabled || redirect?.startsWith("/invite/")) && (
            <p className="mt-4 text-sm text-light-1000 dark:text-dark-1000">
              <Trans>
                Don't have an account?{" "}
                <span className="underline">
                  <Link
                    href={redirect ? `/signup?next=${redirect}` : "/signup"}
                  >
                    Sign up
                  </Link>
                </span>
              </Trans>
            </p>
          )}
        </div>
      </AuthBrandShell>
    </>
  );
}
