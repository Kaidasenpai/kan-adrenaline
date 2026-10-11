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

export default function SignUpPage() {
  const router = useRouter();
  const isSignUpDisabled = env("NEXT_PUBLIC_DISABLE_SIGN_UP") === "true";
  const [isMagicLinkSent, setIsMagicLinkSent] = useState<boolean>(false);
  const [magicLinkRecipient, setMagicLinkRecipient] = useState<string>("");

  const redirect = useSearchParams().get("next");

  const { data } = authClient.useSession();

  if (data?.user.id) router.push(redirect ?? "/boards");

  const handleMagicLinkSent = (value: boolean, recipient: string) => {
    setIsMagicLinkSent(value);
    setMagicLinkRecipient(recipient);
  };

  const isInviteFlow = redirect?.startsWith("/invite/");

  if (isSignUpDisabled && !isInviteFlow) {
    return (
      <>
        <PageHead title={t`Sign up | Adrenaline Tasks`} />
        <AuthBrandShell>
          <div className="flex w-full flex-col">
            <h1 className="mb-6 text-3xl font-semibold tracking-[-0.035em] text-light-1000 dark:text-dark-1000">
              {t`Sign up disabled`}
            </h1>
            <p className="text-md text-light-1000 dark:text-dark-1000">
              {t`This workspace is invite-only. Ask your team for an invitation.`}
            </p>
          </div>
        </AuthBrandShell>
      </>
    );
  }

  return (
    <>
      <PageHead title={t`Sign up | Adrenaline Tasks`} />
      <AuthBrandShell>
        <div className="flex w-full flex-col">
          <h1 className="mb-6 text-3xl font-semibold tracking-[-0.035em] text-light-1000 dark:text-dark-1000">
            {isMagicLinkSent ? t`Check your inbox` : t`Get started`}
          </h1>
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
                <Auth setIsMagicLinkSent={handleMagicLinkSent} isSignUp />
              </div>
            </div>
          )}
          <p className="mt-4 text-sm text-light-1000 dark:text-dark-1000">
            <Trans>
              Already have an account?{" "}
              <span className="underline">
                <Link href={redirect ? `/login?next=${redirect}` : "/login"}>
                  Sign in
                </Link>
              </span>
            </Trans>
          </p>
        </div>
      </AuthBrandShell>
    </>
  );
}
