import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { languageKeys, readLanguage, useLanguage } from "@/features/connect/language";

describe("Independent audience language preferences", () => {
  beforeEach(() => localStorage.clear());

  it("defaults both audiences to English", () => {
    expect(readLanguage(localStorage, "admin")).toBe("en");
    expect(readLanguage(localStorage, "consumer")).toBe("en");
  });

  it("keeps Chinese admin and German consumer selections independent", () => {
    const admin = renderHook(() => useLanguage("admin"));
    const consumer = renderHook(() => useLanguage("consumer"));
    act(() => admin.result.current[1]("zh"));
    act(() => consumer.result.current[1]("de"));
    expect(admin.result.current[0]).toBe("zh");
    expect(consumer.result.current[0]).toBe("de");
    expect(localStorage.getItem(languageKeys.admin)).toBe("zh");
    expect(localStorage.getItem(languageKeys.consumer)).toBe("de");
  });

  it("restores both preferences after remounting", () => {
    const admin = renderHook(() => useLanguage("admin"));
    const consumer = renderHook(() => useLanguage("consumer"));
    act(() => admin.result.current[1]("de"));
    act(() => consumer.result.current[1]("zh"));
    admin.unmount();
    consumer.unmount();
    expect(renderHook(() => useLanguage("admin")).result.current[0]).toBe("de");
    expect(renderHook(() => useLanguage("consumer")).result.current[0]).toBe("zh");
  });

  it("falls back to English for invalid or unavailable stored preferences", () => {
    localStorage.setItem(languageKeys.admin, "fr");
    expect(readLanguage(localStorage, "admin")).toBe("en");
    expect(
      readLanguage(
        {
          getItem: () => {
            throw new Error("Unavailable");
          },
        },
        "consumer",
      ),
    ).toBe("en");
  });
});
