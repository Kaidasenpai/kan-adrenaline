import Link from "next/link";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";

import { BrandLogo } from "~/components/BrandLogo";
import { PageHead } from "~/components/PageHead";
import PatternedBackground from "~/components/PatternedBackground";

export default function NotFoundPage() {
  return (
    <>
      <PageHead title={t`404 - Page Not Found | Adrenaline Tasks`} />
      <main className="min-h-dvh bg-light-100 dark:bg-dark-50">
        <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
          <div className="z-10 flex w-full flex-col items-center">
            <Link href="/" className="mb-8">
              <BrandLogo size="lg" />
            </Link>
            <p className="mb-4 text-8xl font-bold tracking-tight text-light-1000 dark:text-dark-1000">
              404
            </p>
            <p className="mb-10 text-3xl font-bold tracking-tight text-light-1000 dark:text-dark-1000">
              <Trans>Page not found</Trans>
            </p>
            <div className="w-full rounded-lg border border-light-500 bg-light-300 px-4 py-10 dark:border-dark-400 dark:bg-dark-200 sm:max-w-md lg:px-10">
              <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <p className="mb-6 text-center text-light-900 dark:text-dark-900">
                  <Trans>
                    The page you're looking for doesn't exist or has been moved.
                  </Trans>
                </p>
                <div className="flex flex-col gap-3">
                  <Link
                    href="/"
                    className="flex w-full justify-center rounded-md bg-[#B4D234] px-3 py-2 text-sm font-semibold text-black hover:bg-[#A4C02F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4D234]"
                  >
                    <Trans>Go to homepage</Trans>
                  </Link>
                  <Link
                    href="/boards"
                    className="flex w-full justify-center rounded-md border border-light-500 bg-light-100 px-3 py-2 text-sm font-semibold text-light-1000 shadow-sm hover:bg-light-200 dark:border-dark-400 dark:bg-dark-100 dark:text-dark-1000 dark:hover:bg-dark-300"
                  >
                    <Trans>Go to boards</Trans>
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <PatternedBackground />
        </div>
      </main>
    </>
  );
}
