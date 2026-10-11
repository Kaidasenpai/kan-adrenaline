import type { ReactNode } from "react";
import { t } from "@lingui/core/macro";

import { BrandLogo } from "./BrandLogo";
import { LanguageSelector } from "./LanguageSelector";
import ThemeToggle from "./ThemeToggle";

export default function AuthBrandShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative grid min-h-dvh bg-light-100 text-light-1000 dark:bg-dark-50 dark:text-dark-1000 lg:grid-cols-[1.15fr_1fr]">
      <div className="absolute end-4 top-4 z-10 flex items-center gap-2">
        <LanguageSelector compact />
        <ThemeToggle />
      </div>
      <aside className="relative hidden min-h-dvh flex-col justify-between border-e border-light-400 px-[clamp(3rem,6vw,6rem)] py-14 dark:border-dark-400 lg:flex">
        <BrandLogo size="lg" />
        <div className="my-14">
          <h2 className="max-w-[530px] text-balance text-[clamp(2.75rem,4.2vw,4.2rem)] font-semibold leading-[1.08] tracking-[-0.055em]">{t`The work behind the show.`}</h2>
          <p className="mt-6 max-w-[450px] text-lg leading-relaxed text-light-950 dark:text-dark-950">{t`Projects, events, and production at Adrenaline Entertainment.`}</p>
          <div
            aria-hidden="true"
            className="relative mt-12 h-[190px] w-[330px] max-w-full xl:h-[260px] xl:w-[430px]"
          >
            <div className="absolute start-0 top-0 h-[75%] w-[65%] border border-light-800 dark:border-dark-700" />
            <div className="bg-brand-lime absolute start-[55%] top-[30%] h-[29%] w-[22%]" />
            <div className="absolute bottom-0 start-[32%] h-[50%] w-[46%] bg-light-300 dark:bg-dark-200" />
            <div className="absolute bottom-0 end-0 h-[48%] w-[36%] border border-light-800 dark:border-dark-700" />
          </div>
        </div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-light-950 dark:text-dark-950">
          {t`Adrenaline Entertainment`}
        </p>
      </aside>
      <section className="flex min-w-0 flex-col items-center justify-center px-6 pb-12 pt-24 sm:px-12 lg:px-14 lg:py-12">
        <BrandLogo size="md" className="mb-14 self-start lg:hidden" />
        <div className="w-full max-w-[380px]">{children}</div>
        <p className="mt-12 text-xs text-light-950 dark:text-dark-950 lg:hidden">
          {t`Adrenaline Entertainment`}
        </p>
      </section>
    </main>
  );
}
