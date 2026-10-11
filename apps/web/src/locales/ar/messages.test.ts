import type { Token } from "@messageformat/parser";
import { setupI18n } from "@lingui/core";
import { compileMessageOrThrow } from "@lingui/message-utils/compileMessage";
import { parse } from "@messageformat/parser";
import { describe, expect, it } from "vitest";

import english from "../en/messages.json";
import { localeFormattingTag } from "../index";
import { messages } from "./messages";
import arabic from "./messages.json";

function argumentsIn(tokens: Token[]): string[] {
  const argumentsFound = new Set<string>();
  const visit = (nodes: Token[]) => {
    for (const token of nodes) {
      if ("arg" in token) argumentsFound.add(token.arg);
      if ("cases" in token)
        token.cases.forEach((choice) => visit(choice.tokens));
      if (token.type === "function" && token.param) visit(token.param);
    }
  };
  visit(tokens);
  return [...argumentsFound].sort();
}

const ar = setupI18n({
  locale: "ar",
  locales: localeFormattingTag("ar"),
  messages: { ar: messages },
});

describe("complete Arabic UI catalog", () => {
  it("covers every source message and preserves interpolated values and rich text", () => {
    expect(Object.keys(arabic).sort()).toEqual(Object.keys(english).sort());
    for (const [id, source] of Object.entries(english)) {
      const translated = (arabic as Record<string, { translation: string }>)[id]
        ?.translation;
      expect(translated, `${id}: ${source.message}`).toBeTruthy();
      if (!translated) continue;
      expect(() => compileMessageOrThrow(translated), id).not.toThrow();
      expect(argumentsIn(parse(translated)), id).toEqual(
        argumentsIn(parse(source.message)),
      );
      expect(
        [...translated.matchAll(/<\/?\d+>/g)].map((match) => match[0]).sort(),
        id,
      ).toEqual(
        [...source.message.matchAll(/<\/?\d+>/g)]
          .map((match) => match[0])
          .sort(),
      );
    }
  });

  it("uses natural Arabic plurals across all six number categories", () => {
    const entry = Object.entries(english).find(
      ([, value]) => value.message === "{0} cards due",
    );
    expect(entry).toBeDefined();
    if (!entry) return;
    const [id] = entry;
    const translated =
      (arabic as Record<string, { translation: string }>)[id]?.translation ??
      "";
    const plural = parse(translated).find((token) => token.type === "plural");
    expect(
      plural && "cases" in plural
        ? plural.cases.map((choice) => choice.key).sort()
        : [],
    ).toEqual(["zero", "one", "two", "few", "many", "other"].sort());
    for (const count of [0, 1, 2, 3, 11, 100]) {
      const text = ar._(id, { 0: count });
      expect(text).toMatch(/[\u0600-\u06ff]/);
      expect(text).not.toMatch(/cards|\{|\}/);
    }
  });

  it("formats Arabic numbers and Gregorian dates without changing stored values", () => {
    expect(ar.number(12)).toBe("١٢");
    const date = new Date("2026-10-11T12:00:00Z");
    expect(
      ar.date(date, {
        calendar: "gregory",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
    ).toContain("أكتوبر");
    expect(date.toISOString()).toBe("2026-10-11T12:00:00.000Z");
  });
});
