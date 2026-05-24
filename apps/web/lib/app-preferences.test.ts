import { describe, expect, it } from "vitest";
import {
  applyAppPreferencesToDocument,
  buildGoogleTranslateUrl,
  getCurrencyOption,
  getLanguageOption,
  normalizeAppPreferences,
  toMarketDataCurrency,
} from "./app-preferences";

describe("app preferences", () => {
  it("normalizes invalid preference input to safe defaults", () => {
    expect(
      normalizeAppPreferences({
        theme: "neon" as never,
        displayCurrency: "bad",
        preferredLanguage: "xx",
      }),
    ).toMatchObject({
      theme: "auto",
      displayCurrency: "USD",
      preferredLanguage: "ru",
      analyticsEnabled: false,
      hideSmallBalances: true,
      hideUnknownTokens: true,
      hideFlaggedActivity: true,
    });
  });

  it("supports broad local currency and language lookups", () => {
    expect(getCurrencyOption("jpy").symbol).toBe("¥");
    expect(getLanguageOption("de").nativeName).toBe("Deutsch");
  });

  it("maps unsupported market data currencies to USD", () => {
    expect(toMarketDataCurrency("EUR")).toBe("EUR");
    expect(toMarketDataCurrency("JPY")).toBe("USD");
  });

  it("builds a bounded Google Translate URL", () => {
    const url = buildGoogleTranslateUrl({
      targetLanguage: "en",
      pageUrl: "https://24wallet.ru/settings?x=1",
    });

    expect(url).toContain("translate.google.com");
    expect(url).toContain("tl=en");
    expect(url).toContain("24wallet.ru");
  });

  it("applies theme, currency, and language to the document root", () => {
    const doc = document.implementation.createHTMLDocument("Acorus");

    applyAppPreferencesToDocument(
      {
        theme: "dark",
        displayCurrency: "eur",
        preferredLanguage: "en",
      },
      doc,
    );

    expect(doc.documentElement.dataset.acorusTheme).toBe("dark");
    expect(doc.documentElement.dataset.acorusThemePreference).toBe("dark");
    expect(doc.documentElement.dataset.acorusCurrency).toBe("EUR");
    expect(doc.documentElement.lang).toBe("en");
  });
});
