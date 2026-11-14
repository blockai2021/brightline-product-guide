import { describe, expect, it } from "vitest";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import {
  createQrArtifacts,
  parseSerialCsv,
  productBrandSlug,
  resolvePublishedProduct,
  unitFileName,
} from "@/features/connect/digital-link-qr";
import {
  buildBrandedDigitalLinkUri,
  createProductUnits,
  DEMO_DIGITAL_LINK_BASE_URL,
  generateSerialCandidates,
} from "@/features/connect/domain";
import { initialState } from "@/features/connect/seed";

describe("L-006 frontend delivery", () => {
  it("encodes the exact branded HTTPS unit URI in the downloadable PNG", async () => {
    const uri = buildBrandedDigitalLinkUri({
      baseUrl: DEMO_DIGITAL_LINK_BASE_URL,
      brandSlug: "nova-home",
      gtin: "04012345678901",
      serial: "A/1+!",
    });
    const artifacts = await createQrArtifacts(uri);
    const image = PNG.sync.read(Buffer.from(artifacts.png.split(",")[1] ?? "", "base64"));
    expect(jsQR(new Uint8ClampedArray(image.data), image.width, image.height)?.data).toBe(
      "https://id.product-icode.example/nova-home/01/04012345678901/21/A%2F1%2B%21",
    );
    expect(artifacts.svg).toContain("<svg");
  });
  it("creates ten distinct units and rejects the same ten without issuing again", () => {
    const candidates = generateSerialCandidates({ prefix: "L006", start: 1, count: 10 });
    if (!candidates.ok) throw new Error(candidates.message);
    const input = {
      productId: "demo-prod-airpure-001",
      batchId: "demo-batch-2026-11",
      serials: candidates.serials,
    };
    const first = createProductUnits(initialState(), input);
    expect(first.created).toHaveLength(10);
    expect(new Set(first.created.map((u) => u.serial)).size).toBe(10);
    const repeated = createProductUnits(first.state, input);
    expect(repeated.created).toHaveLength(0);
    expect(repeated.rejected).toHaveLength(10);
    expect(repeated.state.identities).toEqual(first.state.identities);
  });
  it("rejects quantities outside the Issue's 1–1000 range", () => {
    expect(generateSerialCandidates({ prefix: "A", start: 0, count: 0 }).ok).toBe(false);
    expect(generateSerialCandidates({ prefix: "A", start: 0, count: 1001 }).ok).toBe(false);
    expect(generateSerialCandidates({ prefix: "A", start: 0, count: 1000 }).ok).toBe(true);
  });
  it("parses quoted serials and full exported CSV using the serial column", () => {
    expect(parseSerialCsv('serial\r\n"A,1"\r\n"A""2"')).toEqual(["A,1", 'A"2']);
    expect(
      parseSerialCsv(
        'productId,SKU,batchId,batch,GTIN,serial,absoluteUri\r\np,s,b,c,04012345678901,"A,1",https://example.test',
      ),
    ).toEqual(["A,1"]);
  });
  it("only resolves a published product when its brand matches the issued unit", () => {
    const state = initialState();
    const product = state.products[0]?.published;
    if (!product) throw new Error("Missing published seed");
    expect(productBrandSlug(product)).toBe("nova-home");
    const identity = { gtin: "04012345678901", serial: "NH26000128" };
    expect(resolvePublishedProduct(state, { ...identity, brandSlug: "nova-home" })?.id).toBe(
      product.id,
    );
    expect(
      resolvePublishedProduct(state, { ...identity, brandSlug: "other-brand" }),
    ).toBeUndefined();
    expect(
      resolvePublishedProduct(state, { ...identity, serial: "missing", brandSlug: "nova-home" }),
    ).toBeUndefined();
    expect(resolvePublishedProduct(state, identity)?.id).toBe(product.id);
  });
  it("resolves two distinct brands and rejects a swapped brand for both model and unit", () => {
    const state = initialState();
    const source = state.products[0]?.published;
    if (!source) throw new Error("Missing product");
    const other = {
      ...structuredClone(source),
      id: "other",
      brand: "Second Brand",
      slug: "second",
      gtin: "09506000134352",
    };
    state.products.push({ draft: other, published: structuredClone(other) });
    state.batches.push({
      id: "other-batch",
      productId: "other",
      batchNumber: "B",
      status: "Draft",
    });
    const created = createProductUnits(state, {
      productId: "other",
      batchId: "other-batch",
      serials: ["SECOND1"],
    }).state;
    expect(
      resolvePublishedProduct(created, {
        brandSlug: "second-brand",
        gtin: other.gtin,
        serial: "SECOND1",
      })?.id,
    ).toBe("other");
    expect(
      resolvePublishedProduct(created, {
        brandSlug: "nova-home",
        gtin: other.gtin,
        serial: "SECOND1",
      }),
    ).toBeUndefined();
    expect(
      resolvePublishedProduct(created, { brandSlug: "second-brand", gtin: other.gtin })?.slug,
    ).toBe("second");
    expect(
      resolvePublishedProduct(created, { brandSlug: "nova-home", gtin: other.gtin }),
    ).toBeUndefined();
    created.products[1] = { draft: other };
    expect(
      resolvePublishedProduct(created, {
        brandSlug: "second-brand",
        gtin: other.gtin,
        serial: "SECOND1",
      }),
    ).toBeUndefined();
  });
  it("reads only published slugs even when the selected draft changes", () => {
    const state = initialState();
    const entry = state.products[0];
    if (!entry) throw new Error("Missing product");
    entry.draft = { ...entry.draft, slug: "unpublished-slug", brand: "Unpublished brand" };
    expect(resolvePublishedProduct(state, { slug: "airpure-mini" })?.name).toBe("AirPure Mini");
    expect(resolvePublishedProduct(state, { slug: "unpublished-slug" })).toBeUndefined();
    expect(
      resolvePublishedProduct(state, { brandSlug: "nova-home", gtin: "04012345678901" })?.brand,
    ).toBe("NOVA Home");
  });
  it("makes download names safe for serials containing path separators", () => {
    expect(unitFileName("DE-APM-001", "A/1+!")).toBe("DE-APM-001-A_1__");
  });
});
