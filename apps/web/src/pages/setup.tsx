import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { useState } from "react";

import { authClient } from "@kan/auth/client";

import AuthBrandShell from "~/components/AuthBrandShell";
import Button from "~/components/Button";
import Input from "~/components/Input";
import { PageHead } from "~/components/PageHead";

export default function SetupPage() {
  const router = useRouter();
  const token =
    typeof router.query.token === "string" ? router.query.token : "";
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 12) {
      setError(t`Use at least 12 characters. This setup link works once.`);
      return;
    }
    if (password.length > 128) {
      setError(t`Your password is too long. Use no more than 128 characters.`);
      return;
    }
    if (password !== confirmation) {
      setError(t`Passwords must match.`);
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.resetPassword({
        token,
        newPassword: password,
      });
      if (result.error) {
        setError(t`This setup link has expired or has already been used.`);
      } else {
        setComplete(true);
        // Remove the one-time credential from browser history after use.
        await router.replace("/setup");
      }
    } catch {
      setError(t`We could not save your password. Please try again.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHead title={t`Set up your account | Adrenaline Tasks`} />
      <AuthBrandShell>
        <section className="w-full max-w-md">
          <h1 className="mb-3 text-3xl font-bold tracking-tight">
            {complete ? t`Your account is ready` : t`Choose your password`}
          </h1>
          {complete ? (
            <>
              <p className="mb-6">{t`Sign in to start managing your projects, events, and production tasks.`}</p>
              <Button href="/login" fullWidth>{t`Sign in`}</Button>
            </>
          ) : !token ? (
            <p>{t`Open your private setup link to activate your account.`}</p>
          ) : (
            <form noValidate onSubmit={submit} className="space-y-5">
              <p>{t`Use at least 12 characters. This setup link works once.`}</p>
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium"
                >{t`Password`}</label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="confirmation"
                  className="mb-2 block text-sm font-medium"
                >{t`Confirm password`}</label>
                <Input
                  id="confirmation"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </div>
              {error && (
                <p
                  role="alert"
                  className="text-sm text-red-600 dark:text-red-400"
                >
                  {error}
                </p>
              )}
              <Button
                type="submit"
                isLoading={busy}
                disabled={busy}
                fullWidth
              >{t`Save password`}</Button>
            </form>
          )}
          <Link
            href="/login"
            className="mt-6 inline-block text-sm underline underline-offset-4 focus-visible:outline focus-visible:outline-2"
          >{t`Back to sign in`}</Link>
        </section>
      </AuthBrandShell>
    </>
  );
}
