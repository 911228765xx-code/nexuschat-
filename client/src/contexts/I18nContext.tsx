import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export type Locale = "en" | "zh-CN" | "zh-TW" | "ja" | "ko" | "ar";

export interface LocaleInfo {
  code: Locale;
  name: string;
  flag: string;
  dir: "ltr" | "rtl";
}

export const LOCALES: LocaleInfo[] = [
  { code: "en", name: "English", flag: "🇺🇸", dir: "ltr" },
  { code: "zh-CN", name: "简体中文", flag: "🇨🇳", dir: "ltr" },
  { code: "zh-TW", name: "繁體中文", flag: "🇭🇰", dir: "ltr" },
  { code: "ja", name: "日本語", flag: "🇯🇵", dir: "ltr" },
  { code: "ko", name: "한국어", flag: "🇰🇷", dir: "ltr" },
  { code: "ar", name: "العربية", flag: "🇸🇦", dir: "rtl" },
];

type TranslationMap = Record<string, string>;

// Lazy-load locale JSON files — each ~50KB, loaded on demand
// This reduces the main bundle by ~280KB (from 328KB to ~50KB per locale)
const localeLoaders: Record<Locale, () => Promise<{ default: TranslationMap }>> = {
  "en": () => import("../locales/en.json"),
  "zh-CN": () => import("../locales/zh-CN.json"),
  "zh-TW": () => import("../locales/zh-TW.json"),
  "ja": () => import("../locales/ja.json"),
  "ko": () => import("../locales/ko.json"),
  "ar": () => import("../locales/ar.json"),
};

// In-memory cache for loaded locales
const translationCache: Partial<Record<Locale, TranslationMap>> = {};

async function loadLocale(locale: Locale): Promise<TranslationMap> {
  if (translationCache[locale]) return translationCache[locale]!;
  const mod = await localeLoaders[locale]();
  translationCache[locale] = mod.default;
  return mod.default;
}

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
  localeInfo: LocaleInfo;
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem("nexuschat-locale") as Locale;
    return saved && LOCALES.find(l => l.code === saved) ? saved : "zh-CN";
  });

  const [translations, setTranslations] = useState<TranslationMap>({});
  const [fallback, setFallback] = useState<TranslationMap>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load the current locale (and English fallback if needed)
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const loadAll = async () => {
      const [currentTranslations, enTranslations] = await Promise.all([
        loadLocale(locale),
        locale !== "en" ? loadLocale("en") : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setTranslations(currentTranslations);
      if (enTranslations) setFallback(enTranslations);
      else setFallback(currentTranslations);
      setIsLoading(false);
    };

    loadAll();
    return () => { cancelled = true; };
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("nexuschat-locale", newLocale);
    document.documentElement.dir = LOCALES.find(l => l.code === newLocale)?.dir || "ltr";
    document.documentElement.lang = newLocale;
  }, []);

  const t = useCallback((key: string): string => {
    return translations[key] || fallback[key] || key;
  }, [translations, fallback]);

  const localeInfo = LOCALES.find(l => l.code === locale) || LOCALES[0];

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = localeInfo.dir;
  }, [locale, localeInfo.dir]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir: localeInfo.dir, localeInfo, isLoading }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
