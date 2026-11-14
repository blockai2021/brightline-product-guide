import { describe, expect, it } from "vitest";
import {
  DPP_DEMO_LABEL,
  buildDppProductDeepLink,
  buildDppStatusEndpointPath,
  createDemoDppStatusAdapter,
  dppStatusV1Schema,
  dppTechnicalErrorV1Schema,
  parseDppProductDeepLink,
  productRefV1FromProduct,
  productRefV1Schema,
  type DppStatusV1,
  type ProductRefV1,
} from "@/features/connect/dpp-contracts";
import { createProductUnits, normalizeGtin14 } from "@/features/connect/domain";
import { demoProduct, initialState } from "@/features/connect/seed";
import { migrateLegacyState } from "@/features/connect/store";

const updatedAt = "2026-11-14T12:00:00Z";
const product = (tenantId: string, productId: string): ProductRefV1 => ({
  tenantId,
  productId,
  sku: `SKU-${productId}`,
  gtin: "04012345678901",
  masterDataVersion: 1,
  updatedAt,
});
const readyStatus = (tenantId: string, productId: string): DppStatusV1 => ({
  schemaVersion: "1.0",
  tenantId,
  productId,
  profileId: `dpp-${productId}`,
  status: "READY",
  readiness: { completed: 30, required: 30, percentage: 100, calculationVersion: "1" },
  template: { id: "template-001", version: "1.0", jurisdiction: "EU", sector: "example" },
  updatedAt,
});

describe("C-008 product identity contract", () => {
  it("maps the existing Product.id directly without changing product or issued identity data", () => {
    const state = initialState();
    const before = structuredClone(state);
    const ref = productRefV1FromProduct(state.products[0]!.draft, {
      tenantId: "tenant-001",
      masterDataVersion: 7,
      updatedAt,
    });
    expect(ref).toMatchObject({
      tenantId: "tenant-001",
      productId: demoProduct.id,
      sku: demoProduct.sku,
      gtin: demoProduct.gtin,
      masterDataVersion: 7,
    });
    expect(state).toEqual(before);
    expect(migrateLegacyState(state)).toEqual(state);
    expect(state.schemaVersion).toBe(2);

    const issued = createProductUnits(state, {
      productId: demoProduct.id,
      batchId: "demo-batch-2026-11",
      serials: ["C008000001"],
    });
    expect(issued.created[0]?.productId).toBe(ref.productId);
    expect(issued.state.identities.at(0)?.gtin).toBe(normalizeGtin14(demoProduct.gtin));
  });

  it("omits an invalid optional GTIN from a ProductRef and validates normalized GTIN14 only", () => {
    const ref = productRefV1FromProduct(
      { ...demoProduct, id: "legacy-product", gtin: "DEMO-04012345678901" },
      { tenantId: "tenant-001", masterDataVersion: 1, updatedAt },
    );
    expect(ref.productId).toBe("legacy-product");
    expect(ref.gtin).toBeUndefined();
    expect(() =>
      productRefV1Schema.parse({ ...product("tenant-001", "p1"), gtin: "123" }),
    ).toThrow();
  });
});

describe("C-008 DPP status schema and demo adapter", () => {
  it("keeps NOT_STARTED distinct from unavailable and validates profile/status invariants", async () => {
    const adapter = createDemoDppStatusAdapter({
      session: { authenticated: true, tenantId: "tenant-a" },
      products: [product("tenant-a", "without-profile"), product("tenant-a", "offline")],
      unavailableProductIds: ["offline"],
    });
    const absent = await adapter.getStatus("without-profile");
    expect(absent).toMatchObject({
      ok: true,
      integration: "DEMO_MOCK",
      demoLabel: DPP_DEMO_LABEL,
      data: { status: "NOT_STARTED", profileId: null, readiness: null, updatedAt: null },
    });
    expect(await adapter.getStatus("offline")).toMatchObject({
      ok: false,
      error: { code: "UNAVAILABLE", httpStatus: 503, reason: "SERVICE_UNAVAILABLE" },
    });
    expect(() =>
      dppStatusV1Schema.parse({
        ...readyStatus("tenant-a", "broken"),
        status: "NOT_STARTED",
      }),
    ).toThrow();
    expect(() =>
      dppTechnicalErrorV1Schema.parse({ code: "UNAVAILABLE", httpStatus: 200 }),
    ).toThrow();
  });

  it("returns 401, 403, 404 and timeout separately without exposing another tenant", async () => {
    const products = [product("tenant-a", "allowed"), product("tenant-b", "tenant-b-only")];
    const unauthenticated = createDemoDppStatusAdapter({
      session: { authenticated: false },
      products,
    });
    expect(await unauthenticated.getStatus("allowed")).toMatchObject({
      ok: false,
      error: { code: "UNAUTHENTICATED", httpStatus: 401 },
    });

    const adapter = createDemoDppStatusAdapter({
      session: {
        authenticated: true,
        tenantId: "tenant-a",
        authorizedProductIds: ["allowed", "timeout"],
      },
      products: [...products, product("tenant-a", "denied"), product("tenant-a", "timeout")],
      statuses: [readyStatus("tenant-a", "allowed")],
      timeoutProductIds: ["timeout"],
    });
    expect(await adapter.getStatus("allowed")).toMatchObject({
      ok: true,
      data: { tenantId: "tenant-a", productId: "allowed", status: "READY" },
    });
    expect(await adapter.getStatus("denied")).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN", httpStatus: 403 },
    });
    expect(await adapter.getStatus("tenant-b-only")).toMatchObject({
      ok: false,
      error: { code: "FORBIDDEN", httpStatus: 403 },
    });
    expect(await adapter.getStatus("missing")).toMatchObject({
      ok: false,
      error: { code: "NOT_FOUND", httpStatus: 404 },
    });
    expect(await adapter.getStatus("timeout")).toMatchObject({
      ok: false,
      error: { code: "UNAVAILABLE", httpStatus: 503, reason: "TIMEOUT" },
    });
    const bulk = await adapter.getStatuses(["allowed", "tenant-b-only", "missing"]);
    expect(bulk.map((result) => (result.ok ? result.data.productId : result.error.code))).toEqual([
      "allowed",
      "FORBIDDEN",
      "NOT_FOUND",
    ]);
  });

  it("rejects duplicate composite identities and statuses for unknown products", () => {
    expect(() =>
      createDemoDppStatusAdapter({
        session: { authenticated: true, tenantId: "tenant-a" },
        products: [product("tenant-a", "same"), product("tenant-a", "same")],
      }),
    ).toThrow("Duplicate tenantId + productId");
    expect(() =>
      createDemoDppStatusAdapter({
        session: { authenticated: true, tenantId: "tenant-a" },
        products: [],
        statuses: [readyStatus("tenant-a", "missing")],
      }),
    ).toThrow("unknown product");
  });
});

describe("C-008 secure DPP deep links", () => {
  const baseUrl = "https://dpp.product-icode.com";
  const allowedOrigins = [baseUrl];

  it("roundtrips an encoded productId and never adds credentials or query parameters", () => {
    const productId = "产品/id?revision=1";
    const link = buildDppProductDeepLink({ baseUrl, allowedOrigins, productId });
    const parsed = new URL(link);
    expect(parsed.origin).toBe(baseUrl);
    expect(parsed.search).toBe("");
    expect(parsed.hash).toBe("");
    expect(parsed.username).toBe("");
    expect(parseDppProductDeepLink(link, allowedOrigins)).toBe(productId);
    expect(buildDppStatusEndpointPath(productId)).toBe(
      "/v1/products/%E4%BA%A7%E5%93%81%2Fid%3Frevision%3D1/dpp-status",
    );
  });

  it("ignores extra token-shaped input and rejects untrusted or malformed URLs", () => {
    const link = buildDppProductDeepLink({
      baseUrl,
      allowedOrigins,
      productId: "product-001",
      accessToken: "must-not-leak",
    } as Parameters<typeof buildDppProductDeepLink>[0] & { accessToken: string });
    expect(link).not.toContain("must-not-leak");
    for (const candidate of [
      "http://dpp.product-icode.com",
      "https://attacker.example",
      "https://dpp.product-icode.com/?access_token=secret",
    ]) {
      expect(() =>
        buildDppProductDeepLink({ baseUrl: candidate, allowedOrigins, productId: "product-001" }),
      ).toThrow();
    }
    expect(() =>
      parseDppProductDeepLink(
        "https://dpp.product-icode.com/products/product-001?access_token=secret",
        allowedOrigins,
      ),
    ).toThrow("Untrusted DPP deep link");
  });
});

