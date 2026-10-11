export const locales = [
  "en",
  "ar",
  "fr",
  "de",
  "es",
  "it",
  "nl",
  "ru",
  "pl",
  "ptbr",
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  fr: "Français",
  de: "Deutsch",
  es: "Español",
  it: "Italiano",
  nl: "Nederlands",
  ru: "Русский",
  pl: "Polski",
  ptbr: "Português",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return locales.some((locale) => locale === value);
}

export function localeTag(locale: Locale): string {
  return locale === "ptbr" ? "pt-BR" : locale;
}

export function localeFormattingTag(locale: Locale): string {
  return locale === "ar" ? "ar-u-nu-arab" : localeTag(locale);
}

export function localeDirection(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function matchBrowserLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const normalized = language.toLowerCase().replaceAll("_", "-");
    if (normalized === "pt-br" || normalized === "ptbr") return "ptbr";
    const base = normalized.split("-")[0];
    if (isLocale(base)) return base;
  }
  return defaultLocale;
}
