import { describe, expect, it } from "vitest";
import { createDemoDppStatusAdapter } from "@/features/connect/dpp-contracts";
import { buildDigitalLinkPath, normalizeGtin14 } from "@/features/connect/domain";
import {
  MULTI_INDUSTRY_DEMO_DATASET_ID,
  MULTI_INDUSTRY_DEMO_RESET_PHRASE,
  MULTI_INDUSTRY_DEMO_TENANT_ID,
  createMultiIndustryDemoBundle,
  loadMultiIndustryDemoData,
  resetMultiIndustryDemoData,
  validateMultiIndustryDemoBundle,
} from "@/features/connect/multi-industry-demo";
import { initialState } from "@/features/connect/seed";

describe("V1.1 multi-industry demo bundle", () => {
  it("builds deterministic smart-home, safety-footwear and battery fixtures", () => {
    const first = createMultiIndustryDemoBundle();
    const second = createMultiIndustryDemoBundle();
    expect(second).toEqual(first);
    expect(first.manifest).toMatchObject({
      datasetId: MULTI_INDUSTRY_DEMO_DATASET_ID,
      tenantId: MULTI_INDUSTRY_DEMO_TENANT_ID,
      isDemo: true,
      containsPersonalData: false,
      claimsGs1Assignment: false,
      persistence: "EXPLICIT_MERGE_ONLY",
    });
    expect(first.markers.map((marker) => marker.industry)).toEqual([
      "smart-home",
      "safety-footwear",
      "battery",
    ]);
    expect(first.state.products).toHaveLength(3);
    expect(first.state.batches).toHaveLength(3);
    expect(first.state.units).toHaveLength(9);
    expect(first.state.identities).toHaveLength(9);
    expect(first.productRefs).toHaveLength(3);
    expect(first.dppStatuses.map((status) => status.status)).toEqual([
      "IN_PROGRESS",
      "IN_REVIEW",
      "NEEDS_UPDATE",
    ]);
  });

  it("keeps format-only identifiers visibly synthetic and internally consistent", () => {
    const bundle = createMultiIndustryDemoBundle();
    expect(validateMultiIndustryDemoBundle(bundle)).toEqual([]);
    const pairs = new Set<string>();
    for (const entry of bundle.state.products) {
      expect(entry.draft.name).toMatch(/^\[DEMO]/);
      expect(entry.draft.gtinStatus).toBe("Demo");
      expect(normalizeGtin14(entry.draft.gtin)).toBe(entry.draft.gtin);
      expect(entry.published).toEqual(entry.draft);
      expect(bundle.markers.find((marker) => marker.productId === entry.draft.id)).toMatchObject({
        isDemo: true,
        dataClassification: "SYNTHETIC_DEMO_ONLY",
        identifierClaim: "FORMAT_VALID_SYNTHETIC_NOT_GS1_ASSIGNED",
      });
    }
    for (const unit of bundle.state.units) {
      const identity = bundle.state.identities.find((value) => value.unitId === unit.id);
      const product = bundle.state.products.find(
        (value) => value.draft.id === unit.productId,
      )?.draft;
      expect(identity).toBeDefined();
      expect(product).toBeDefined();
      expect(identity?.canonicalPath).toBe(buildDigitalLinkPath(product!.gtin, unit.serial));
      pairs.add(`${identity?.gtin}:${identity?.serial}`);
    }
    expect(pairs.size).toBe(9);
    expect(bundle.state.transparency.every((value) => value.state === "Not enrolled")).toBe(true);
    expect(bundle.state.transparency.every((value) => value.evidence === "Simulated")).toBe(true);
  });

  it("contains localized consumer snapshots but no consumer personal or behavioral data", () => {
    const bundle = createMultiIndustryDemoBundle();
    expect(bundle.state.records).toEqual([]);
    expect(bundle.state.consents).toEqual([]);
    expect(bundle.state.campaigns).toEqual([]);
    expect(bundle.state.visits).toBe(0);
    expect(JSON.stringify(bundle)).not.toMatch(/@[a-z0-9.-]+\.[a-z]{2,}/i);
    for (const content of bundle.state.contents) {
      expect(content.state).toBe("Published");
      for (const locale of ["en", "de", "zh"] as const) {
        expect(content.description[locale]).toBeTruthy();
        expect(content.manual[locale]).toBeTruthy();
        expect(content.faq[locale]).toBeTruthy();
      }
    }
  });

  it("detects corrupted references, identity data, markers and DPP tenant scope", () => {
    const bundle = createMultiIndustryDemoBundle();
    bundle.state.products[0]!.draft.gtinStatus = "Verified by GS1";
    bundle.state.identities[0]!.serial = "MISMATCH";
    bundle.dppStatuses[0]!.tenantId = "other-tenant";
    (bundle.markers[0] as { isDemo: boolean }).isDemo = false;
    const codes = validateMultiIndustryDemoBundle(bundle).map((issue) => issue.code);
    expect(codes).toContain("DEMO_MARKER");
    expect(codes).toContain("IDENTITY");
    expect(codes).toContain("DPP_STATUS");
  });

  it("feeds the C-008 read-only adapter without claiming remote data or SSO", async () => {
    const bundle = createMultiIndustryDemoBundle();
    const adapter = createDemoDppStatusAdapter({
      session: { authenticated: true, tenantId: MULTI_INDUSTRY_DEMO_TENANT_ID },
      products: bundle.productRefs,
      statuses: bundle.dppStatuses,
    });
    const result = await adapter.getStatus(bundle.productRefs[2]!.productId);
    expect(result).toMatchObject({
      ok: true,
      integration: "DEMO_MOCK",
      data: { status: "NEEDS_UPDATE", tenantId: MULTI_INDUSTRY_DEMO_TENANT_ID },
    });
  });
});

describe("V1.1 multi-industry load and reset protection", () => {
  it("loads atomically without overwriting existing browser data and repeats as a no-op", () => {
    const current = initialState();
    const before = structuredClone(current);
    const loaded = loadMultiIndustryDemoData(current);
    expect(loaded.status).toBe("loaded");
    expect(current).toEqual(before);
    expect(loaded.state.products.slice(0, current.products.length)).toEqual(current.products);
    expect(loaded.state.records).toEqual(current.records);
    expect(loaded.state.consents).toEqual(current.consents);
    expect(loaded.state.visits).toBe(current.visits);

    const repeated = loadMultiIndustryDemoData(loaded.state);
    expect(repeated.status).toBe("already-loaded");
    expect(repeated.state).toBe(loaded.state);
  });

  it("blocks partial IDs and GTIN conflicts instead of repairing or overwriting them", () => {
    const bundle = createMultiIndustryDemoBundle();
    const current = initialState();
    const partial = {
      ...current,
      products: [...current.products, structuredClone(bundle.state.products[0]!)],
    };
    const partialBefore = structuredClone(partial);
    const partialResult = loadMultiIndustryDemoData(partial, bundle);
    expect(partialResult).toMatchObject({ status: "blocked", reason: "DATASET_COLLISION" });
    expect(partialResult.state).toEqual(partialBefore);

    const conflict = structuredClone(current);
    conflict.products[0]!.draft.gtin = bundle.state.products[0]!.draft.gtin;
    const conflictBefore = structuredClone(conflict);
    const conflictResult = loadMultiIndustryDemoData(conflict, bundle);
    expect(conflictResult).toMatchObject({ status: "blocked", reason: "IDENTITY_CONFLICT" });
    expect(conflictResult.state).toEqual(conflictBefore);
  });

  it("requires exact confirmation and blocks reset after edits or new dependent records", () => {
    const loaded = loadMultiIndustryDemoData(initialState());
    if (loaded.status !== "loaded") throw new Error("Fixture did not load");
    const noConfirmation = resetMultiIndustryDemoData(loaded.state, {
      datasetId: MULTI_INDUSTRY_DEMO_DATASET_ID,
      phrase: "reset",
    });
    expect(noConfirmation).toMatchObject({ status: "blocked", reason: "CONFIRMATION_REQUIRED" });
    expect(noConfirmation.state).toBe(loaded.state);

    const modified = structuredClone(loaded.state);
    const demo = modified.products.find((entry) => entry.draft.id.startsWith("demo-v11-"));
    if (!demo) throw new Error("Demo product missing");
    demo.draft.name = "User edited demo name";
    expect(
      resetMultiIndustryDemoData(modified, {
        datasetId: MULTI_INDUSTRY_DEMO_DATASET_ID,
        phrase: MULTI_INDUSTRY_DEMO_RESET_PHRASE,
      }),
    ).toMatchObject({ status: "blocked", reason: "DATASET_MODIFIED_OR_PARTIAL" });

    const dependent = structuredClone(loaded.state);
    const product = createMultiIndustryDemoBundle().state.products[0]!.draft;
    dependent.records.push({
      id: "local-user-record",
      productId: product.id,
      name: "Synthetic local note",
      email: "nobody@example.test",
      serial: "",
      date: "2026-11-14",
      kind: "Support",
      details: "Local dependency used to protect reset",
      status: "New",
    });
    expect(
      resetMultiIndustryDemoData(dependent, {
        datasetId: MULTI_INDUSTRY_DEMO_DATASET_ID,
        phrase: MULTI_INDUSTRY_DEMO_RESET_PHRASE,
      }),
    ).toMatchObject({ status: "blocked", reason: "DEPENDENT_DATA_EXISTS" });
  });

  it("removes only exact fixture entities and restores the original state", () => {
    const original = initialState();
    const loaded = loadMultiIndustryDemoData(original);
    if (loaded.status !== "loaded") throw new Error("Fixture did not load");
    const reset = resetMultiIndustryDemoData(loaded.state, {
      datasetId: MULTI_INDUSTRY_DEMO_DATASET_ID,
      phrase: MULTI_INDUSTRY_DEMO_RESET_PHRASE,
    });
    expect(reset.status).toBe("reset");
    expect(reset.state).toEqual(original);
  });
});

