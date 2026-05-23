export type AppTheme = "auto" | "light" | "dark";

export type AppPreferences = {
  theme: AppTheme;
  displayCurrency: string;
  preferredLanguage: string;
  analyticsEnabled: boolean;
  hideSmallBalances: boolean;
  hideUnknownTokens: boolean;
  hideFlaggedActivity: boolean;
};

export type AppCurrencyOption = {
  code: string;
  name: string;
  symbol: string;
};

export type AppLanguageOption = {
  code: string;
  name: string;
  nativeName: string;
};

const DEFAULT_CURRENCY_OPTION: AppCurrencyOption = {
  code: "USD",
  name: "US Dollar",
  symbol: "$",
};

const DEFAULT_LANGUAGE_OPTION: AppLanguageOption = {
  code: "ru",
  name: "Russian",
  nativeName: "Русский",
};

export const APP_CURRENCIES = [
  DEFAULT_CURRENCY_OPTION,
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "RUB", name: "Russian Ruble", symbol: "₽" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "BRL", name: "Brazilian Real", symbol: "R$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "KRW", name: "South Korean Won", symbol: "₩" },
  { code: "KZT", name: "Kazakhstani Tenge", symbol: "₸" },
  { code: "MXN", name: "Mexican Peso", symbol: "Mex$" },
  { code: "NOK", name: "Norwegian Krone", symbol: "kr" },
  { code: "PLN", name: "Polish Zloty", symbol: "zł" },
  { code: "SEK", name: "Swedish Krona", symbol: "kr" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺" },
  { code: "UAH", name: "Ukrainian Hryvnia", symbol: "₴" },
] as const satisfies readonly AppCurrencyOption[];

export const MARKET_DATA_CURRENCIES = ["USD", "EUR", "RUB"] as const;

export const APP_LANGUAGES = [
  DEFAULT_LANGUAGE_OPTION,
  { code: "en", name: "English", nativeName: "English" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "tr", name: "Turkish", nativeName: "Türkçe" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська" },
  { code: "kk", name: "Kazakh", nativeName: "Қазақша" },
  { code: "zh-CN", name: "Chinese Simplified", nativeName: "简体中文" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
] as const satisfies readonly AppLanguageOption[];

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  theme: "auto",
  displayCurrency: "USD",
  preferredLanguage: "ru",
  analyticsEnabled: false,
  hideSmallBalances: true,
  hideUnknownTokens: true,
  hideFlaggedActivity: true,
};

const APP_THEME_VALUES = new Set<AppTheme>(["auto", "light", "dark"]);
const APP_CURRENCY_CODES = new Set(APP_CURRENCIES.map((item) => item.code));
const APP_LANGUAGE_CODES = new Set(APP_LANGUAGES.map((item) => item.code));

export function isAppTheme(value: unknown): value is AppTheme {
  return typeof value === "string" && APP_THEME_VALUES.has(value as AppTheme);
}

export function isAppCurrencyCode(value: unknown): value is string {
  return typeof value === "string" && APP_CURRENCY_CODES.has(value.toUpperCase());
}

export function isAppLanguageCode(value: unknown): value is string {
  return typeof value === "string" && APP_LANGUAGE_CODES.has(value);
}

export function toMarketDataCurrency(value: string): "USD" | "EUR" | "RUB" {
  const normalized = value.toUpperCase();
  return MARKET_DATA_CURRENCIES.includes(normalized as "USD" | "EUR" | "RUB")
    ? (normalized as "USD" | "EUR" | "RUB")
    : "USD";
}

export function normalizeAppPreferences(
  input: Partial<AppPreferences> | null | undefined,
): AppPreferences {
  const displayCurrency = input?.displayCurrency?.toUpperCase();
  return {
    theme: isAppTheme(input?.theme) ? input.theme : DEFAULT_APP_PREFERENCES.theme,
    displayCurrency: isAppCurrencyCode(displayCurrency)
      ? displayCurrency
      : DEFAULT_APP_PREFERENCES.displayCurrency,
    preferredLanguage: isAppLanguageCode(input?.preferredLanguage)
      ? input.preferredLanguage
      : DEFAULT_APP_PREFERENCES.preferredLanguage,
    analyticsEnabled: input?.analyticsEnabled ?? DEFAULT_APP_PREFERENCES.analyticsEnabled,
    hideSmallBalances: input?.hideSmallBalances ?? DEFAULT_APP_PREFERENCES.hideSmallBalances,
    hideUnknownTokens: input?.hideUnknownTokens ?? DEFAULT_APP_PREFERENCES.hideUnknownTokens,
    hideFlaggedActivity: input?.hideFlaggedActivity ?? DEFAULT_APP_PREFERENCES.hideFlaggedActivity,
  };
}

export function getCurrencyOption(code: string): AppCurrencyOption {
  return APP_CURRENCIES.find((item) => item.code === code.toUpperCase()) ?? DEFAULT_CURRENCY_OPTION;
}

export function getLanguageOption(code: string): AppLanguageOption {
  return APP_LANGUAGES.find((item) => item.code === code) ?? DEFAULT_LANGUAGE_OPTION;
}

export function buildGoogleTranslateUrl(input: {
  targetLanguage: string;
  pageUrl: string;
}): string {
  const targetLanguage = isAppLanguageCode(input.targetLanguage)
    ? input.targetLanguage
    : DEFAULT_APP_PREFERENCES.preferredLanguage;
  const url = input.pageUrl.slice(0, 2048);
  const params = new URLSearchParams({
    sl: "auto",
    tl: targetLanguage,
    u: url,
  });

  return `https://translate.google.com/translate?${params.toString()}`;
}
