import type { Locale as DateFnsLocale } from "date-fns";
import { useLingui } from "@lingui/react";
import { ar, de, enGB, es, fr, it, nl, pl, ptBR, ru } from "date-fns/locale";

import type { Locale } from "~/locales";
import { localeDirection } from "~/locales";
import { useLinguiContext } from "~/providers/lingui";

export function useLocalisation() {
  const { i18n } = useLingui();
  const { locale, setLocale, availableLocales } = useLinguiContext();

  const dateLocaleMap: Partial<Record<Locale, DateFnsLocale>> = {
    en: enGB,
    ar,
    fr,
    de,
    es,
    it,
    nl,
    ru,
    pl,
    ptbr: ptBR,
  };

  const currentDateLocale = dateLocaleMap[locale] ?? enGB;

  return {
    locale,
    dateLocale: currentDateLocale,
    setLocale,
    availableLocales,
    isRTL: localeDirection(locale) === "rtl",
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) =>
      i18n.number(value, options),
    formatDate: (
      date: Date,
      options: Intl.DateTimeFormatOptions = {
        day: "numeric",
        month: "short",
        year: "numeric",
      },
    ) => i18n.date(date, { calendar: "gregory", ...options }),
  };
}
