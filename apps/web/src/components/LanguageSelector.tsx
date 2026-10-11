import { t } from "@lingui/core/macro";
import { useId, useState } from "react";
import { HiLanguage } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { useLocalisation } from "~/hooks/useLocalisation";
import { isLocale, localeNames, localeTag } from "~/locales";

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, availableLocales } = useLocalisation();
  const id = useId();
  const [error, setError] = useState("");

  return (
    <div className={twMerge("relative", !compact && "mt-8")}>
      <HiLanguage
        aria-hidden="true"
        className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-light-950 dark:text-dark-950"
      />
      <select
        id={`language-select-${id}`}
        aria-label={t`Language`}
        value={locale}
        onChange={(event) => {
          if (isLocale(event.target.value)) {
            setError("");
            void setLocale(event.target.value).catch(() =>
              setError(t`Please try again later, or contact customer support.`),
            );
          }
        }}
        className={twMerge(
          "focus:border-brand-accent focus:ring-brand-accent dark:focus:border-brand-lime dark:focus:ring-brand-lime block h-11 w-full max-w-[180px] rounded-lg border border-light-300 bg-light-50 pe-8 ps-10 text-sm text-light-1000 dark:border-dark-400 dark:bg-dark-100 dark:text-dark-1000",
          compact && "h-10 w-[138px] text-xs",
        )}
      >
        {availableLocales.map((loc) => (
          <option key={loc} value={loc} lang={localeTag(loc)}>
            {localeNames[loc]}
          </option>
        ))}
      </select>
      {error && (
        <p
          role="alert"
          className="mt-2 max-w-[240px] text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}
