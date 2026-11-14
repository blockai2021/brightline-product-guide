import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Locale } from "./domain";
import { translateAdmin } from "./translations";

export const languageKeys = {
  admin: "icode-connect-admin-language",
  consumer: "icode-connect-consumer-language",
} as const;

export function readLanguage(
  storage: Pick<Storage, "getItem">,
  scope: keyof typeof languageKeys,
): Locale {
  try {
    const value = storage.getItem(languageKeys[scope]);
    return value === "zh" || value === "de" ? value : "en";
  } catch {
    return "en";
  }
}

export function useLanguage(scope: keyof typeof languageKeys) {
  const [language, setLanguage] = useState<Locale>("en");
  useEffect(() => {
    setLanguage(readLanguage(localStorage, scope));
  }, [scope]);
  function selectLanguage(value: Locale) {
    setLanguage(value);
    try {
      localStorage.setItem(languageKeys[scope], value);
    } catch {
      /* Keep the selection in memory when storage is unavailable. */
    }
  }
  return [language, selectLanguage] as const;
}

const AdminLanguage = createContext<Locale>("en");
export function AdminLanguageProvider({
  language,
  children,
}: {
  language: Locale;
  children: ReactNode;
}) {
  return <AdminLanguage.Provider value={language}>{children}</AdminLanguage.Provider>;
}
export function useAdminTranslation() {
  const language = useContext(AdminLanguage);
  return {
    language,
    t: (key: string, params?: Record<string, string | number>) =>
      translateAdmin(language, key, params),
  };
}
