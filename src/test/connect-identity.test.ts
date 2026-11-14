import { describe, expect, it } from "vitest";
import {
  buildDigitalLinkPath,
  encodeGs1PathSegment,
  findUnitByIdentity,
  isValidAi21Serial,
  normalizeGtin14,
} from "@/features/connect/domain";
import { initialState } from "@/features/connect/seed";
import { migrateLegacyState } from "@/features/connect/store";

describe("GS1 demo identity rules", () => {
  it("validates the GTIN check digit without treating demo prefixes as GTINs", () => {
    expect(normalizeGtin14("04012345678901")).toBe("04012345678901");
    expect(normalizeGtin14("DEMO-04012345678901")).toBeNull();
    expect(normalizeGtin14("04012345678902")).toBeNull();
  });

  it("enforces the AI (21) length and encodable character boundary", () => {
    expect(isValidAi21Serial("A1/b+2")).toBe(true);
    expect(isValidAi21Serial("A".repeat(20))).toBe(true);
    expect(isValidAi21Serial("A".repeat(21))).toBe(false);
    expect(isValidAi21Serial("序列号")).toBe(false);
  });

  it("strictly percent-encodes serial path delimiters", () => {
    expect(encodeGs1PathSegment("A/1+!")).toBe("A%2F1%2B%21");
    expect(buildDigitalLinkPath("04012345678901", "A/1+!")).toBe(
      "/01/04012345678901/21/A%2F1%2B%21",
    );
  });

  it("resolves a unit from the compound GTIN and serial identity", () => {
    const state = initialState();
    expect(findUnitByIdentity(state, "04012345678901", "NH26000128")?.id).toBe("demo-unit-000128");
    expect(findUnitByIdentity(state, "04012345678901", "UNKNOWN")).toBeUndefined();
  });
});

describe("local demo migration", () => {
  it("keeps a v2 state idempotent", () => {
    const state = initialState();
    expect(migrateLegacyState(state)).toBe(state);
  });

  it("rejects malformed legacy state", () => {
    expect(migrateLegacyState({ products: [] })).toBeNull();
  });
});
