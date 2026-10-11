import type { ReactNode } from "react";
import { I18nProvider } from "@lingui/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import type { Locale } from "~/locales";
import {
  defaultLocale,
  isLocale,
  localeDirection,
  localeFormattingTag,
  locales,
  localeTag,
  matchBrowserLocale,
} from "~/locales";
import { i18n, initializeI18n, loadLocale } from "~/utils/i18n";

interface LinguiContextType {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  availableLocales: Locale[];
}

const LinguiContext = createContext<LinguiContextType | undefined>(undefined);

export function useLinguiContext() {
  const context = useContext(LinguiContext);
  if (!context)
    throw new Error("useLinguiContext must be used within a LinguiProvider");
  return context;
}

export function LinguiProviderWrapper({
  children,
  initialLocale = defaultLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setActiveLocale] = useState<Locale>(defaultLocale);
  const request = useRef(0);
  initializeI18n();

  const setLocale = useCallback(async (nextLocale: Locale) => {
    const currentRequest = ++request.current;
    // Load first so direction, copy and selected language change together.
    try {
      await loadLocale(nextLocale);
    } catch (error) {
      if (currentRequest !== request.current) return;
      throw error;
    }
    if (currentRequest !== request.current) return;
    i18n.activate(nextLocale, localeFormattingTag(nextLocale));
    document.documentElement.lang = localeTag(nextLocale);
    document.documentElement.dir = localeDirection(nextLocale);
    setActiveLocale(nextLocale);
    try {
      localStorage.setItem("locale", nextLocale);
    } catch {
      // Language selection also works when browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    let savedLocale: string | null = null;
    try {
      savedLocale = localStorage.getItem("locale");
    } catch {
      // Fall back to the browser preference in private/restricted contexts.
    }
    const preferredLocale = isLocale(savedLocale)
      ? savedLocale
      : initialLocale !== defaultLocale
        ? initialLocale
        : matchBrowserLocale(
            navigator.languages.length
              ? navigator.languages
              : [navigator.language],
          );
    void setLocale(preferredLocale).catch(() => setLocale(defaultLocale));
    return () => {
      request.current += 1;
    };
  }, [initialLocale, setLocale]);

  return (
    <LinguiContext.Provider
      value={{ locale, setLocale, availableLocales: [...locales] }}
    >
      <I18nProvider i18n={i18n} key={locale}>
        {children}
      </I18nProvider>
    </LinguiContext.Provider>
  );
}
