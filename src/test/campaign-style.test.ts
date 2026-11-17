import { describe, expect, it } from "vitest";
import { campaignCoverStyle, safeImageUrl, safeThemeColor } from "@/features/connect/campaign-style";

describe("campaign customisation", () => {
  it("keeps the default look when nothing is customised", () => {
    expect(campaignCoverStyle({})).toBeUndefined();
  });
  it("accepts only https cover images", () => {
    expect(safeImageUrl("http://x.test/a.jpg")).toBeUndefined();
    expect(safeImageUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeImageUrl("https://x.test/a.jpg")).toBe("https://x.test/a.jpg");
  });
  it("accepts only #rrggbb theme colours and picks readable text", () => {
    expect(safeThemeColor("red")).toBeUndefined();
    expect(campaignCoverStyle({ themeColor: "#22252b" })?.color).toBe("#ffffff");
    expect(campaignCoverStyle({ themeColor: "#f5f0d0" })?.color).toBe("#111111");
  });
});
