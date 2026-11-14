import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { saveDraft, type DemoState } from "@/features/connect/domain";
import { demoProduct, initialState } from "@/features/connect/seed";
import {
  PRODUCT_IMPORT_CSV_TEMPLATE,
  PRODUCT_IMPORT_HEADER_ALIASES,
  PRODUCT_IMPORT_TEMPLATE_COLUMNS,
  ProductImportError,
  applyProductImport,
  parseProductCsv,
  parseProductXlsx,
  previewProductImport,
  serializeProductImportResultCsv,
  type ProductImportOptions,
} from "@/features/connect/product-import";

const mapping: ProductImportOptions["fieldMapping"] = {
  external_id: "externalProductId",
  sku: "sku",
  brand: "brand",
  model: "model",
  name: "name",
  gtin: "gtin",
  manufacturer: "manufacturer",
  image_url: "imageUrl",
  description_en: "description.en",
  description_de: "description.de",
  description_zh: "description.zh",
  materials: "materials",
  specs: "specs",
};
const header = Object.keys(mapping).join(",");
const options = (mode: ProductImportOptions["mode"] = "upsert"): ProductImportOptions => ({
  mode,
  fieldMapping: mapping,
});
function emptyCatalogState(): DemoState {
  return {
    ...initialState(),
    products: [],
    contents: [],
    batches: [],
    units: [],
    identities: [],
    transparency: [],
    records: [],
  };
}
function csvRow(input: {
  external?: string;
  sku: string;
  brand?: string;
  model?: string;
  name?: string;
  gtin?: string;
  en?: string;
  de?: string;
  zh?: string;
}) {
  return [
    input.external ?? "",
    input.sku,
    input.brand ?? "Brand A",
    input.model ?? "",
    input.name ?? `Product ${input.sku}`,
    input.gtin ?? "",
    "",
    "",
    input.en ?? "",
    input.de ?? "",
    input.zh ?? "",
    "",
    "",
  ].join(",");
}

describe("product import parsing", () => {
  it("parses BOM, quoted commas, escaped quotes and embedded newlines", () => {
    const table = parseProductCsv(
      '\uFEFFsku,brand,name,description_en\r\nSKU-1,"Brand, A","Air ""Plus""","Line one\nLine two"',
    );
    expect(table.headers).toEqual(["sku", "brand", "name", "description_en"]);
    expect(table.rows[0]?.values).toEqual({
      sku: "SKU-1",
      brand: "Brand, A",
      name: 'Air "Plus"',
      description_en: "Line one\nLine two",
    });
  });

  it("parses a minimal XLSX worksheet and requires selection for multiple sheets", () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ["sku", "brand", "name"],
        ["SKU-X", "Brand X", "XLSX product"],
      ]),
      "Products",
    );
    const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    expect(parseProductXlsx(bytes)).toMatchObject({
      sheetName: "Products",
      rows: [{ rowNumber: 2, values: { sku: "SKU-X", brand: "Brand X", name: "XLSX product" } }],
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["sku"], ["OTHER"]]), "Other");
    const multi = XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    expect(() => parseProductXlsx(multi)).toThrow("Select one worksheet");
    expect(parseProductXlsx(multi, { sheetName: "Products" }).rows).toHaveLength(1);
  });

  it("exposes an explicit template and multilingual alias suggestions without fuzzy matching", () => {
    expect(PRODUCT_IMPORT_TEMPLATE_COLUMNS).toContain("description.zh");
    expect(PRODUCT_IMPORT_CSV_TEMPLATE).toContain("externalProductId,sku,brand");
    expect(PRODUCT_IMPORT_HEADER_ALIASES.sku).toContain("货号");
  });
});

describe("product import preview and apply", () => {
  it("classifies 500 rows and handles the 1,000-row local demo target", () => {
    for (const size of [500, 1000]) {
      const rows = Array.from({ length: size }, (_, index) =>
        csvRow({ external: `EXT-${index}`, sku: `SKU-${index}` }),
      );
      const table = parseProductCsv([header, ...rows].join("\n"));
      const plan = previewProductImport(emptyCatalogState(), table, options());
      expect(plan.counts.create).toBe(size);
      expect(plan.counts.error + plan.counts.conflict).toBe(0);
    }
  });

  it("supports create-only, update-only and upsert without duplicate products", () => {
    const table = parseProductCsv([header, csvRow({ external: "EXT-1", sku: "SKU-1" })].join("\n"));
    const empty = emptyCatalogState();
    expect(previewProductImport(empty, table, options("update-only")).rows[0]?.action).toBe("skip");
    const createPlan = previewProductImport(empty, table, options("create-only"));
    const created = applyProductImport(empty, createPlan, {
      confirmed: true,
      createId: () => "one",
    });
    expect(created.state.products).toHaveLength(1);
    expect(previewProductImport(created.state, table, options("create-only")).rows[0]?.action).toBe(
      "skip",
    );
    expect(previewProductImport(created.state, table, options("upsert")).rows[0]?.action).toBe(
      "skip",
    );

    const updateTable = parseProductCsv(
      [header, csvRow({ external: "EXT-1", sku: "SKU-1", name: "Updated name" })].join("\n"),
    );
    const updated = applyProductImport(
      created.state,
      previewProductImport(created.state, updateTable, options("update-only")),
      { confirmed: true },
    );
    expect(updated.state.products[0]?.draft.name).toBe("Updated name");
  });

  it("uses external ID as the primary controlled key and never silently rebinds a SKU", () => {
    const state = {
      ...emptyCatalogState(),
      products: [
        { draft: { ...structuredClone(demoProduct), id: "one", externalProductId: "EXT-1" } },
        {
          draft: {
            ...structuredClone(demoProduct),
            id: "two",
            externalProductId: "EXT-2",
            sku: "SKU-2",
          },
        },
      ],
    };
    const table = parseProductCsv(
      [header, csvRow({ external: "EXT-1", sku: "SKU-2", brand: demoProduct.brand })].join("\n"),
    );
    expect(previewProductImport(state, table, options()).rows[0]).toMatchObject({
      action: "conflict",
      issues: [{ code: "EXTERNAL_ID_CONFLICT" }],
    });
    const wrongBrand = parseProductCsv(
      [header, csvRow({ external: "EXT-1", sku: demoProduct.sku, brand: "Another Brand" })].join(
        "\n",
      ),
    );
    expect(previewProductImport(state, wrongBrand, options()).rows[0]).toMatchObject({
      action: "conflict",
      issues: [{ code: "EXTERNAL_ID_CONFLICT" }],
    });
  });

  it("does not clear omitted or blank fields and updates languages independently", () => {
    const state = initialState();
    const table = parseProductCsv(
      "sku,brand,name,gtin,description_en,description_de,description_zh\nDE-APM-001,NOVA Home,AirPure Updated,,,,更新后的中文描述",
    );
    const plan = previewProductImport(state, table, {
      mode: "update-only",
      fieldMapping: {
        sku: "sku",
        brand: "brand",
        name: "name",
        gtin: "gtin",
        description_en: "description.en",
        description_de: "description.de",
        description_zh: "description.zh",
      },
    });
    const applied = applyProductImport(state, plan, { confirmed: true });
    const draft = applied.state.products[0]!.draft;
    expect(draft.name).toBe("AirPure Updated");
    expect(draft.gtin).toBe(demoProduct.gtin);
    expect(draft.description.en).toBe(demoProduct.description.en);
    expect(draft.description.de).toBe(demoProduct.description.de);
    expect(draft.description.zh).toBe("更新后的中文描述");
  });

  it("allows only explicitly whitelisted clear tokens", () => {
    const table = parseProductCsv("sku,brand,description_en\nDE-APM-001,NOVA Home,__CLEAR__");
    const baseOptions: ProductImportOptions = {
      mode: "update-only",
      fieldMapping: { sku: "sku", brand: "brand", description_en: "description.en" },
    };
    expect(previewProductImport(initialState(), table, baseOptions).rows[0]).toMatchObject({
      action: "error",
      issues: [{ code: "CLEAR_NOT_ALLOWED" }],
    });
    const allowed = { ...baseOptions, clearFields: ["description.en" as const] };
    const plan = previewProductImport(initialState(), table, allowed);
    expect(
      applyProductImport(initialState(), plan, { confirmed: true }).state.products[0]?.draft
        .description.en,
    ).toBe("");
  });

  it("rejects invalid GTINs and duplicate controlled keys", () => {
    const invalid = parseProductCsv(
      [
        header,
        csvRow({ external: "DUP", sku: "SKU-DUP", gtin: "04012345678902" }),
        csvRow({ external: "DUP", sku: "SKU-DUP" }),
      ].join("\n"),
    );
    const codes = previewProductImport(emptyCatalogState(), invalid, options()).rows.flatMap(
      (row) => row.issues.map((entry) => entry.code),
    );
    expect(codes).toContain("INVALID_GTIN");
    expect(codes).toContain("DUPLICATE_EXTERNAL_ID");
    expect(codes).toContain("DUPLICATE_SKU");
  });

  it("allows the same SKU across brands and only updates the matching brand", () => {
    const table = parseProductCsv(
      [
        header,
        csvRow({ external: "BRAND-A-1", sku: "SHARED-1", brand: "Brand A", name: "A" }),
        csvRow({ external: "BRAND-B-1", sku: "SHARED-1", brand: "Brand B", name: "B" }),
      ].join("\n"),
    );
    const empty = emptyCatalogState();
    const plan = previewProductImport(empty, table, options());
    expect(plan.counts).toMatchObject({ create: 2, conflict: 0, error: 0 });
    let id = 0;
    const created = applyProductImport(empty, plan, {
      confirmed: true,
      createId: () => String(++id),
    });
    expect(created.state.products.map((entry) => [entry.draft.brand, entry.draft.sku])).toEqual([
      ["Brand A", "SHARED-1"],
      ["Brand B", "SHARED-1"],
    ]);

    const update = parseProductCsv(
      [header, csvRow({ sku: "SHARED-1", brand: "Brand B", name: "B updated" })].join("\n"),
    );
    const updatePlan = previewProductImport(created.state, update, options("update-only"));
    expect(updatePlan.rows[0]).toMatchObject({
      action: "update",
      productId: "import-2",
    });
    const updated = applyProductImport(created.state, updatePlan, { confirmed: true });
    expect(
      updated.state.products.find((entry) => entry.draft.brand === "Brand A")?.draft.name,
    ).toBe("A");
    expect(
      updated.state.products.find((entry) => entry.draft.brand === "Brand B")?.draft.name,
    ).toBe("B updated");
  });

  it("still rejects GTIN reuse when different brands share a SKU", () => {
    const existing = {
      ...emptyCatalogState(),
      products: [{ draft: { ...structuredClone(demoProduct), id: "brand-a", sku: "SHARED-2" } }],
    };
    const table = parseProductCsv(
      [
        header,
        csvRow({
          sku: "SHARED-2",
          brand: "Brand B",
          name: "Brand B product",
          gtin: demoProduct.gtin,
        }),
      ].join("\n"),
    );
    expect(previewProductImport(existing, table, options()).rows[0]).toMatchObject({
      action: "conflict",
      issues: [{ code: "GTIN_CONFLICT" }],
    });
  });

  it("treats published snapshots and issued identities as GTIN owners", () => {
    const state = {
      ...emptyCatalogState(),
      products: [
        {
          draft: { ...structuredClone(demoProduct), id: "published-owner", gtin: "09506000134352" },
          published: { ...structuredClone(demoProduct), id: "published-owner" },
        },
      ],
    };
    const table = parseProductCsv(
      [
        header,
        csvRow({
          sku: "NEW-SKU",
          brand: "Brand B",
          name: "New product",
          gtin: demoProduct.gtin,
        }),
      ].join("\n"),
    );
    expect(previewProductImport(state, table, options()).rows[0]).toMatchObject({
      action: "conflict",
      issues: [{ code: "GTIN_CONFLICT" }],
    });

    const identityOnly = {
      ...state,
      products: [],
      units: [
        {
          id: "issued-unit",
          productId: "retired-product",
          batchId: "retired-batch",
          serial: "SERIAL-1",
          status: "Activated" as const,
          createdAt: "2026-11-14T00:00:00Z",
        },
      ],
      identities: [
        {
          id: "issued-identity",
          unitId: "issued-unit",
          gtin: demoProduct.gtin,
          serial: "SERIAL-1",
          canonicalPath: `/01/${demoProduct.gtin}/21/SERIAL-1`,
          issuedAt: "2026-11-14T00:00:00Z",
        },
      ],
    };
    expect(previewProductImport(identityOnly, table, options()).rows[0]).toMatchObject({
      action: "conflict",
      issues: [{ code: "GTIN_CONFLICT" }],
    });
  });

  it("protects issued GTINs and preserves published snapshots and identity data", () => {
    const state = initialState();
    const table = parseProductCsv(
      [
        header,
        csvRow({ sku: demoProduct.sku, brand: demoProduct.brand, gtin: "09506000134352" }),
      ].join("\n"),
    );
    expect(previewProductImport(state, table, options("update-only")).rows[0]).toMatchObject({
      action: "conflict",
      issues: [{ code: "ISSUED_GTIN_IMMUTABLE" }],
    });

    const safeTable = parseProductCsv(
      [header, csvRow({ sku: demoProduct.sku, brand: demoProduct.brand, name: "Draft only" })].join(
        "\n",
      ),
    );
    const before = structuredClone(state);
    const plan = previewProductImport(state, safeTable, options("update-only"));
    expect(state).toEqual(before);
    const applied = applyProductImport(state, plan, { confirmed: true });
    expect(applied.state.products[0]?.draft.name).toBe("Draft only");
    expect(applied.state.products[0]?.published).toEqual(state.products[0]?.published);
    expect(applied.state.units).toEqual(state.units);
    expect(applied.state.identities).toEqual(state.identities);
    expect(applied.state.batches).toEqual(state.batches);
  });

  it("requires confirmation and rejects a stale preview", () => {
    const table = parseProductCsv(
      [header, csvRow({ sku: demoProduct.sku, brand: demoProduct.brand, name: "Planned" })].join(
        "\n",
      ),
    );
    const state = initialState();
    const plan = previewProductImport(state, table, options("update-only"));
    expect(() =>
      applyProductImport(state, plan, { confirmed: false } as unknown as { confirmed: true }),
    ).toThrowError(
      new ProductImportError("CONFIRMATION_REQUIRED", "Explicit confirmation is required."),
    );
    const changed = saveDraft(state, { ...state.products[0]!.draft, name: "Concurrent change" });
    expect(() => applyProductImport(changed, plan, { confirmed: true })).toThrow(
      "run dry-run again",
    );
  });

  it("expires a create preview when a concurrent product claims its GTIN", () => {
    const table = parseProductCsv(
      [
        header,
        csvRow({
          external: "EXT-NEW",
          sku: "SKU-NEW",
          brand: "Brand B",
          gtin: "09506000134352",
        }),
      ].join("\n"),
    );
    const empty = emptyCatalogState();
    const plan = previewProductImport(empty, table, options());
    expect(plan.rows[0]?.action).toBe("create");
    const changed = {
      ...empty,
      products: [
        {
          draft: {
            ...structuredClone(demoProduct),
            id: "concurrent",
            sku: "OTHER",
            gtin: "09506000134352",
          },
        },
      ],
    };
    expect(() => applyProductImport(changed, plan, { confirmed: true })).toThrow(
      "run dry-run again",
    );
  });

  it("creates drafts only and never creates serials, identities, QR data or published content", () => {
    const state = emptyCatalogState();
    const table = parseProductCsv(
      [header, csvRow({ sku: "SKU-NEW", gtin: "09506000134352" })].join("\n"),
    );
    const result = applyProductImport(state, previewProductImport(state, table, options()), {
      confirmed: true,
      createId: () => "new",
    });
    expect(result.state.products[0]).toMatchObject({
      draft: {
        id: "import-new",
        sku: "SKU-NEW",
        gtin: "09506000134352",
        gtinStatus: "Format valid · unverified",
      },
    });
    expect(result.rows[0]?.productId).toBe("import-new");
    expect(result.state.products[0]?.published).toBeUndefined();
    expect(result.state.units).toEqual([]);
    expect(result.state.identities).toEqual([]);
    expect(result.state.contents).toEqual([]);
  });

  it("exports a formula-safe result CSV without row source data", () => {
    const csv = serializeProductImportResultCsv({
      rows: [
        {
          rowNumber: 2,
          action: "skip",
          productId: "=CMD()",
          changes: [],
          issues: [{ code: "NO_CHANGES", message: "No change" }],
        },
      ],
    });
    expect(csv).toContain('"\'=CMD()"');
    expect(csv).not.toContain("Brand A");
  });
});

