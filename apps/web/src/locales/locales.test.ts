import { describe, expect, it } from "vitest";

import {
  isLocale,
  localeDirection,
  localeTag,
  matchBrowserLocale,
} from "./index";

describe("language preference matching", () => {
  it("recognizes regional Arabic preferences and respects browser order", () => {
    expect(matchBrowserLocale(["ar-LY", "en-GB"])).toBe("ar");
    expect(matchBrowserLocale(["ar_EG"])).toBe("ar");
    expect(matchBrowserLocale(["en-US", "ar"])).toBe("en");
  });

  it("rejects unsupported persisted values and uses a supported fallback", () => {
    expect(isLocale("ar-LY")).toBe(false);
    expect(isLocale("../../messages")).toBe(false);
    expect(isLocale(null)).toBe(false);
    expect(matchBrowserLocale(["ja-JP", "ar-SA"])).toBe("ar");
    expect(matchBrowserLocale(["ja-JP"])).toBe("en");
  });

  it("restores direction and the correct document tag when leaving Arabic", () => {
    expect(localeDirection("ar")).toBe("rtl");
    expect(localeDirection("en")).toBe("ltr");
    expect(localeTag("ar")).toBe("ar");
    expect(localeTag(matchBrowserLocale(["pt-BR"]))).toBe("pt-BR");
  });
});
