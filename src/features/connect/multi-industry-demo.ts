import {
  buildDigitalLinkPath,
  isValidAi21Serial,
  normalizeGtin14,
  type DemoState,
  type DigitalIdentity,
  type Product,
  type ProductContent,
  type ProductEntry,
  type ProductionBatch,
  type ProductUnit,
  type TransparencyAssociation,
} from "./domain";
import {
  dppStatusV1Schema,
  productRefV1FromProduct,
  type DppStatusV1,
  type ProductRefV1,
} from "./dpp-contracts";

export const MULTI_INDUSTRY_DEMO_DATASET_ID = "product-icode-v1.1-multi-industry-v1" as const;
export const MULTI_INDUSTRY_DEMO_TENANT_ID = "demo-tenant-v11" as const;
export const MULTI_INDUSTRY_DEMO_RESET_PHRASE = "RESET V1.1 DEMO DATA" as const;
export const MULTI_INDUSTRY_DEMO_TIMESTAMP = "2026-11-14T12:00:00Z" as const;

export type DemoIndustry = "smart-home" | "safety-footwear" | "battery";
export type DemoProductMarker = {
  datasetId: typeof MULTI_INDUSTRY_DEMO_DATASET_ID;
  productId: string;
  industry: DemoIndustry;
  isDemo: true;
  dataClassification: "SYNTHETIC_DEMO_ONLY";
  identifierClaim: "FORMAT_VALID_SYNTHETIC_NOT_GS1_ASSIGNED";
};
export type MultiIndustryDemoManifest = {
  datasetId: typeof MULTI_INDUSTRY_DEMO_DATASET_ID;
  datasetVersion: 1;
  tenantId: typeof MULTI_INDUSTRY_DEMO_TENANT_ID;
  generatedAt: typeof MULTI_INDUSTRY_DEMO_TIMESTAMP;
  isDemo: true;
  containsPersonalData: false;
  claimsGs1Assignment: false;
  persistence: "EXPLICIT_MERGE_ONLY";
};
export type MultiIndustryDemoBundle = {
  manifest: MultiIndustryDemoManifest;
  markers: readonly DemoProductMarker[];
  state: DemoState;
  productRefs: readonly ProductRefV1[];
  dppStatuses: readonly DppStatusV1[];
};

export type DemoValidationIssue = {
  code:
    | "MANIFEST"
    | "DEMO_MARKER"
    | "PRODUCT"
    | "GTIN"
    | "REFERENCE"
    | "IDENTITY"
    | "CONSUMER_DATA"
    | "DPP_STATUS";
  message: string;
};

export type DemoLoadResult =
  | { status: "loaded"; state: DemoState; addedProductIds: readonly string[] }
  | { status: "already-loaded"; state: DemoState; addedProductIds: readonly [] }
  | {
      status: "blocked";
      state: DemoState;
      addedProductIds: readonly [];
      reason: "INVALID_DATASET" | "DATASET_COLLISION" | "IDENTITY_CONFLICT";
      issues: readonly string[];
    };

export type DemoResetResult =
  | { status: "reset"; state: DemoState; removedProductIds: readonly string[] }
  | { status: "not-loaded"; state: DemoState; removedProductIds: readonly [] }
  | {
      status: "blocked";
      state: DemoState;
      removedProductIds: readonly [];
      reason: "CONFIRMATION_REQUIRED" | "DATASET_MODIFIED_OR_PARTIAL" | "DEPENDENT_DATA_EXISTS";
      issues: readonly string[];
    };

type ProductFixture = {
  industry: DemoIndustry;
  id: string;
  slug: string;
  name: string;
  model: string;
  sku: string;
  gtinBody: string;
  batchNumber: string;
  serialPrefix: string;
  description: Product["description"];
  manual: Product["manual"];
  faq: Product["faq"];
  manufacturer: string;
  materials: string;
  specs: string;
  dpp: {
    profileId: string;
    status: Exclude<DppStatusV1["status"], "NOT_STARTED">;
    completed: number;
    required: number;
    templateId: string;
    sector: string;
  };
};

const fixtures: readonly ProductFixture[] = [
  {
    industry: "smart-home",
    id: "demo-v11-smart-home-sensor",
    slug: "demo-v11-home-sensor",
    name: "[DEMO] Home Environment Sensor",
    model: "DEMO-HES-01",
    sku: "DEMO-SMART-001",
    gtinBody: "0000001100001",
    batchNumber: "DEMO-SMART-BATCH-01",
    serialPrefix: "DEMO-SM",
    description: {
      en: "Synthetic demo smart-home sensor data for workflow testing only.",
      de: "Synthetische Demo-Daten eines Smart-Home-Sensors, nur für Workflow-Tests.",
      zh: "仅用于流程测试的合成智能家居传感器演示数据。",
    },
    manual: {
      en: "Demo only: pair with a fictional gateway and inspect sample readings.",
      de: "Nur Demo: Mit einem fiktiven Gateway koppeln und Beispieldaten prüfen.",
      zh: "仅限演示：与虚构网关配对并查看样例读数。",
    },
    faq: {
      en: "Is this a real device? No. All product and telemetry details are synthetic.",
      de: "Ist dies ein echtes Gerät? Nein. Alle Produkt- und Telemetriedaten sind synthetisch.",
      zh: "这是真实设备吗？不是，所有产品与遥测信息均为合成数据。",
    },
    manufacturer: "Product iCode Synthetic Demo Manufacturer",
    materials: "Demo ABS enclosure · simulated sensor board",
    specs: "Demo only · temperature and humidity workflow sample",
    dpp: {
      profileId: "demo-dpp-smart-home",
      status: "IN_PROGRESS",
      completed: 6,
      required: 12,
      templateId: "demo-template-smart-home",
      sector: "smart-home-demo",
    },
  },
  {
    industry: "safety-footwear",
    id: "demo-v11-safety-shoe",
    slug: "demo-v11-safety-shoe",
    name: "[DEMO] Protective Safety Shoe",
    model: "DEMO-PPE-S1",
    sku: "DEMO-PPE-001",
    gtinBody: "0000002200002",
    batchNumber: "DEMO-PPE-BATCH-01",
    serialPrefix: "DEMO-PPE",
    description: {
      en: "Synthetic protective-footwear product data; not certified personal protective equipment.",
      de: "Synthetische Produktdaten für Schutzschuhe; keine zertifizierte Schutzausrüstung.",
      zh: "合成劳保鞋产品数据，并非经过认证的个人防护装备。",
    },
    manual: {
      en: "Demo only: inspect the fictional size, material and traceability fields.",
      de: "Nur Demo: Fiktive Größen-, Material- und Rückverfolgbarkeitsfelder prüfen.",
      zh: "仅限演示：查看虚构的尺码、材料和追溯字段。",
    },
    faq: {
      en: "Does this prove PPE compliance? No. No certification or test report is claimed.",
      de: "Belegt dies PSA-Konformität? Nein. Es wird keine Zertifizierung beansprucht.",
      zh: "这能证明劳保合规吗？不能，本数据不声称任何认证或检测报告。",
    },
    manufacturer: "Product iCode Synthetic Demo Manufacturer",
    materials: "Demo microfiber upper · simulated toe cap · demo rubber sole",
    specs: "Demo only · fictional size 42 · no PPE certification",
    dpp: {
      profileId: "demo-dpp-safety-shoe",
      status: "IN_REVIEW",
      completed: 9,
      required: 10,
      templateId: "demo-template-safety-footwear",
      sector: "safety-footwear-demo",
    },
  },
  {
    industry: "battery",
    id: "demo-v11-battery-module",
    slug: "demo-v11-battery-module",
    name: "[DEMO] Rechargeable Battery Module",
    model: "DEMO-BAT-48",
    sku: "DEMO-BAT-001",
    gtinBody: "0000003300003",
    batchNumber: "DEMO-BAT-BATCH-01",
    serialPrefix: "DEMO-BAT",
    description: {
      en: "Synthetic rechargeable-battery data for lifecycle and DPP workflow demonstrations.",
      de: "Synthetische Akkudaten für Lebenszyklus- und DPP-Workflow-Demonstrationen.",
      zh: "用于生命周期与 DPP 流程演示的合成充电电池数据。",
    },
    manual: {
      en: "Demo only: do not install, charge, transport or dispose based on this sample.",
      de: "Nur Demo: Nicht anhand dieses Beispiels installieren, laden, transportieren oder entsorgen.",
      zh: "仅限演示：不得依据本样例进行安装、充电、运输或处置。",
    },
    faq: {
      en: "Is the chemistry or capacity verified? No. Every technical value is fictional.",
      de: "Sind Chemie oder Kapazität geprüft? Nein. Alle technischen Werte sind fiktiv.",
      zh: "电芯体系或容量经过验证吗？没有，全部技术数值均为虚构。",
    },
    manufacturer: "Product iCode Synthetic Demo Manufacturer",
    materials: "Demo cell chemistry · simulated aluminum housing",
    specs: "Demo only · fictional 48 V / 20 Ah · not transport-certified",
    dpp: {
      profileId: "demo-dpp-battery",
      status: "NEEDS_UPDATE",
      completed: 7,
      required: 10,
      templateId: "demo-template-battery",
      sector: "battery-demo",
    },
  },
] as const;

function syntheticGtin14(body: string) {
  if (!/^\d{13}$/.test(body)) throw new Error("Synthetic GTIN body must contain 13 digits");
  const sum = [...body]
    .reverse()
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
  return `${body}${(10 - (sum % 10)) % 10}`;
}

function buildProduct(fixture: ProductFixture): Product {
  return {
    id: fixture.id,
    externalProductId: `DEMO-EXT-${fixture.industry.toUpperCase()}`,
    slug: fixture.slug,
    name: fixture.name,
    brand: "Product iCode Demo",
    model: fixture.model,
    sku: fixture.sku,
    gtin: syntheticGtin14(fixture.gtinBody),
    gtinStatus: "Demo",
    asin: "",
    image: "",
    description: structuredClone(fixture.description),
    manual: structuredClone(fixture.manual),
    video: "",
    faq: structuredClone(fixture.faq),
    manufacturer: fixture.manufacturer,
    materials: fixture.materials,
    specs: fixture.specs,
    publishedAt: MULTI_INDUSTRY_DEMO_TIMESTAMP,
  };
}

function fixtureEntities(fixture: ProductFixture) {
  const product = buildProduct(fixture);
  const entry: ProductEntry = {
    draft: structuredClone(product),
    published: structuredClone(product),
  };
  const content: ProductContent = {
    id: `${fixture.id}-content-v1`,
    productId: fixture.id,
    version: 1,
    state: "Published",
    description: structuredClone(product.description),
    manual: structuredClone(product.manual),
    faq: structuredClone(product.faq),
    video: "",
    createdAt: MULTI_INDUSTRY_DEMO_TIMESTAMP,
    publishedAt: MULTI_INDUSTRY_DEMO_TIMESTAMP,
  };
  const batch: ProductionBatch = {
    id: `${fixture.id}-batch-01`,
    productId: fixture.id,
    batchNumber: fixture.batchNumber,
    productionDate: "2026-11-01",
    status: "Active",
  };
  const units: ProductUnit[] = Array.from({ length: 3 }, (_, index) => {
    const serial = `${fixture.serialPrefix}-${String(index + 1).padStart(4, "0")}`;
    return {
      id: `${fixture.id}-unit-${index + 1}`,
      productId: fixture.id,
      batchId: batch.id,
      serial,
      status: "Activated",
      createdAt: MULTI_INDUSTRY_DEMO_TIMESTAMP,
    };
  });
  const identities: DigitalIdentity[] = units.map((unit) => ({
    id: `${unit.id}-identity`,
    unitId: unit.id,
    gtin: product.gtin,
    serial: unit.serial,
    canonicalPath: buildDigitalLinkPath(product.gtin, unit.serial),
    issuedAt: MULTI_INDUSTRY_DEMO_TIMESTAMP,
  }));
  const transparency: TransparencyAssociation[] = units.map((unit) => ({
    id: `${unit.id}-transparency`,
    unitId: unit.id,
    state: "Not enrolled",
    evidence: "Simulated",
  }));
  const productRef = productRefV1FromProduct(product, {
    tenantId: MULTI_INDUSTRY_DEMO_TENANT_ID,
    masterDataVersion: 1,
    updatedAt: MULTI_INDUSTRY_DEMO_TIMESTAMP,
  });
  const dppStatus = dppStatusV1Schema.parse({
    schemaVersion: "1.0",
    tenantId: MULTI_INDUSTRY_DEMO_TENANT_ID,
    productId: fixture.id,
    profileId: fixture.dpp.profileId,
    status: fixture.dpp.status,
    readiness: {
      completed: fixture.dpp.completed,
      required: fixture.dpp.required,
      percentage: (fixture.dpp.completed / fixture.dpp.required) * 100,
      calculationVersion: "demo-v1",
    },
    template: {
      id: fixture.dpp.templateId,
      version: "demo-1.0",
      jurisdiction: "EU-DEMO",
      sector: fixture.dpp.sector,
    },
    updatedAt: MULTI_INDUSTRY_DEMO_TIMESTAMP,
  });
  const marker: DemoProductMarker = {
    datasetId: MULTI_INDUSTRY_DEMO_DATASET_ID,
    productId: fixture.id,
    industry: fixture.industry,
    isDemo: true,
    dataClassification: "SYNTHETIC_DEMO_ONLY",
    identifierClaim: "FORMAT_VALID_SYNTHETIC_NOT_GS1_ASSIGNED",
  };
  return { entry, content, batch, units, identities, transparency, productRef, dppStatus, marker };
}

export function createMultiIndustryDemoBundle(): MultiIndustryDemoBundle {
  const entities = fixtures.map(fixtureEntities);
  const bundle: MultiIndustryDemoBundle = {
    manifest: {
      datasetId: MULTI_INDUSTRY_DEMO_DATASET_ID,
      datasetVersion: 1,
      tenantId: MULTI_INDUSTRY_DEMO_TENANT_ID,
      generatedAt: MULTI_INDUSTRY_DEMO_TIMESTAMP,
      isDemo: true,
      containsPersonalData: false,
      claimsGs1Assignment: false,
      persistence: "EXPLICIT_MERGE_ONLY",
    },
    markers: entities.map((entity) => entity.marker),
    state: {
      schemaVersion: 2,
      products: entities.map((entity) => entity.entry),
      contents: entities.map((entity) => entity.content),
      batches: entities.map((entity) => entity.batch),
      units: entities.flatMap((entity) => entity.units),
      identities: entities.flatMap((entity) => entity.identities),
      transparency: entities.flatMap((entity) => entity.transparency),
      campaigns: [],
      records: [],
      consents: [],
      visits: 0,
    },
    productRefs: entities.map((entity) => entity.productRef),
    dppStatuses: entities.map((entity) => entity.dppStatus),
  };
  const issues = validateMultiIndustryDemoBundle(bundle);
  if (issues.length) throw new Error(`Invalid multi-industry demo bundle: ${issues[0]!.message}`);
  return bundle;
}

function duplicateValues(values: readonly string[]) {
  const seen = new Set<string>();
  return values.filter((value) => (seen.has(value) ? true : !seen.add(value)));
}

export function validateMultiIndustryDemoBundle(bundle: MultiIndustryDemoBundle) {
  const issues: DemoValidationIssue[] = [];
  const add = (code: DemoValidationIssue["code"], message: string) =>
    issues.push({ code, message });
  const { state } = bundle;
  if (
    bundle.manifest.datasetId !== MULTI_INDUSTRY_DEMO_DATASET_ID ||
    !bundle.manifest.isDemo ||
    bundle.manifest.containsPersonalData ||
    bundle.manifest.claimsGs1Assignment ||
    bundle.manifest.persistence !== "EXPLICIT_MERGE_ONLY"
  )
    add("MANIFEST", "Manifest must identify synthetic, explicit-load, non-GS1 demo data.");
  if (state.schemaVersion !== 2) add("MANIFEST", "DemoState must remain schemaVersion 2.");
  if (state.records.length || state.consents.length)
    add("CONSUMER_DATA", "Demo bundle must not contain consumer records or consents.");
  if (state.campaigns.length || state.visits !== 0)
    add("CONSUMER_DATA", "Demo bundle must not fabricate campaigns or consumer visits.");
  if (state.products.length !== fixtures.length)
    add("PRODUCT", "Bundle must contain exactly one product per planned industry.");
  if (bundle.markers.length !== state.products.length)
    add("DEMO_MARKER", "Every product requires one explicit demo marker.");
  if (bundle.productRefs.length !== state.products.length)
    add("REFERENCE", "Every product requires one ProductRefV1.");
  if (bundle.dppStatuses.length !== state.products.length)
    add("DPP_STATUS", "Every product requires one demo DPP status.");
  if (new Set(bundle.markers.map((marker) => marker.industry)).size !== fixtures.length)
    add("DEMO_MARKER", "Demo markers must cover all three planned industries.");
  if (duplicateValues(state.products.map((entry) => entry.draft.id)).length)
    add("PRODUCT", "Product IDs must be unique.");
  if (duplicateValues(state.products.map((entry) => entry.draft.gtin)).length)
    add("GTIN", "Synthetic GTIN values must be unique inside the bundle.");

  const products = new Map(state.products.map((entry) => [entry.draft.id, entry]));
  const batches = new Map(state.batches.map((batch) => [batch.id, batch]));
  const units = new Map(state.units.map((unit) => [unit.id, unit]));
  const identitiesByUnit = new Map<string, DigitalIdentity[]>();
  for (const identity of state.identities) {
    const values = identitiesByUnit.get(identity.unitId) ?? [];
    values.push(identity);
    identitiesByUnit.set(identity.unitId, values);
  }
  for (const entry of state.products) {
    const product = entry.draft;
    const marker = bundle.markers.find((value) => value.productId === product.id);
    if (!entry.published || entry.published.id !== product.id)
      add("PRODUCT", `Product ${product.id} requires a published consumer snapshot.`);
    if (!product.name.startsWith("[DEMO]") || product.gtinStatus !== "Demo")
      add("DEMO_MARKER", `Product ${product.id} is not visibly marked as demo data.`);
    if (!marker?.isDemo || marker.identifierClaim !== "FORMAT_VALID_SYNTHETIC_NOT_GS1_ASSIGNED")
      add("DEMO_MARKER", `Product ${product.id} has no valid synthetic identifier marker.`);
    if (normalizeGtin14(product.gtin) !== product.gtin)
      add("GTIN", `Product ${product.id} has an invalid format-only test GTIN.`);
    if (
      !state.contents.some(
        (content) => content.productId === product.id && content.state === "Published",
      )
    )
      add("CONSUMER_DATA", `Product ${product.id} has no published consumer content.`);
    if (!bundle.productRefs.some((ref) => ref.productId === product.id))
      add("REFERENCE", `Product ${product.id} has no ProductRefV1.`);
    if (!bundle.dppStatuses.some((status) => status.productId === product.id))
      add("DPP_STATUS", `Product ${product.id} has no DPP status.`);
  }
  for (const content of state.contents) {
    if (!products.has(content.productId)) add("REFERENCE", `Content ${content.id} has no product.`);
  }
  for (const batch of state.batches) {
    if (!products.has(batch.productId)) add("REFERENCE", `Batch ${batch.id} has no product.`);
  }
  for (const unit of state.units) {
    const product = products.get(unit.productId)?.draft;
    const batch = batches.get(unit.batchId);
    const identities = identitiesByUnit.get(unit.id) ?? [];
    if (!product || !batch || batch.productId !== unit.productId)
      add("REFERENCE", `Unit ${unit.id} has an invalid product/batch scope.`);
    if (!isValidAi21Serial(unit.serial)) add("IDENTITY", `Unit ${unit.id} has an invalid serial.`);
    if (identities.length !== 1) add("IDENTITY", `Unit ${unit.id} must have exactly one identity.`);
    const identity = identities[0];
    if (
      identity &&
      product &&
      (identity.gtin !== product.gtin ||
        identity.serial !== unit.serial ||
        identity.canonicalPath !== buildDigitalLinkPath(product.gtin, unit.serial))
    )
      add("IDENTITY", `Identity ${identity.id} does not match its product unit.`);
    const associations = state.transparency.filter((value) => value.unitId === unit.id);
    if (
      associations.length !== 1 ||
      associations[0]?.state !== "Not enrolled" ||
      associations[0]?.evidence !== "Simulated"
    )
      add("IDENTITY", `Unit ${unit.id} must use a simulated, not-enrolled association.`);
  }
  if (
    duplicateValues(state.identities.map((identity) => `${identity.gtin}\u001f${identity.serial}`))
      .length
  )
    add("IDENTITY", "GTIN + serial identities must be unique.");
  for (const identity of state.identities) {
    if (!units.has(identity.unitId)) add("REFERENCE", `Identity ${identity.id} has no unit.`);
  }
  for (const association of state.transparency) {
    if (!units.has(association.unitId))
      add("REFERENCE", `Transparency association ${association.id} has no unit.`);
  }
  for (const ref of bundle.productRefs) {
    const product = products.get(ref.productId)?.draft;
    if (
      ref.tenantId !== bundle.manifest.tenantId ||
      !product ||
      ref.productId !== product.id ||
      ref.gtin !== product.gtin
    )
      add("REFERENCE", `ProductRef ${ref.productId} does not match Connect product master data.`);
  }
  for (const status of bundle.dppStatuses) {
    if (!dppStatusV1Schema.safeParse(status).success)
      add("DPP_STATUS", `DPP status ${status.productId} is invalid.`);
    if (
      status.tenantId !== bundle.manifest.tenantId ||
      !bundle.productRefs.some(
        (ref) => ref.productId === status.productId && ref.tenantId === status.tenantId,
      )
    )
      add("DPP_STATUS", `DPP status ${status.productId} has no matching ProductRef.`);
  }
  return issues;
}

function idSets(bundle: MultiIndustryDemoBundle) {
  return {
    products: new Set(bundle.state.products.map((entry) => entry.draft.id)),
    contents: new Set(bundle.state.contents.map((entry) => entry.id)),
    batches: new Set(bundle.state.batches.map((entry) => entry.id)),
    units: new Set(bundle.state.units.map((entry) => entry.id)),
    identities: new Set(bundle.state.identities.map((entry) => entry.id)),
    transparency: new Set(bundle.state.transparency.map((entry) => entry.id)),
  };
}

function stableEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function datasetPresence(state: DemoState, bundle: MultiIndustryDemoBundle) {
  const expected = idSets(bundle);
  let present = 0;
  let expectedCount = 0;
  const changed: string[] = [];
  function inspect<T>(
    currentValues: readonly T[],
    expectedValues: readonly T[],
    getId: (value: T) => string,
  ) {
    for (const expectedValue of expectedValues) {
      expectedCount += 1;
      const id = getId(expectedValue);
      const current = currentValues.find((value) => getId(value) === id);
      if (current) {
        present += 1;
        if (!stableEqual(current, expectedValue)) changed.push(id);
      }
    }
  }
  inspect(state.products, bundle.state.products, (value) => value.draft.id);
  inspect(state.contents, bundle.state.contents, (value) => value.id);
  inspect(state.batches, bundle.state.batches, (value) => value.id);
  inspect(state.units, bundle.state.units, (value) => value.id);
  inspect(state.identities, bundle.state.identities, (value) => value.id);
  inspect(state.transparency, bundle.state.transparency, (value) => value.id);
  return { expected, present, expectedCount, changed };
}

function identityConflicts(state: DemoState, bundle: MultiIndustryDemoBundle) {
  const bundleProductIds = new Set(bundle.state.products.map((entry) => entry.draft.id));
  const bundleUnitIds = new Set(bundle.state.units.map((unit) => unit.id));
  const gtins = new Set(bundle.state.products.map((entry) => entry.draft.gtin));
  const brandSkus = new Set(
    bundle.state.products.map((entry) => `${entry.draft.brand}\u001f${entry.draft.sku}`),
  );
  const identities = new Set(
    bundle.state.identities.map((identity) => `${identity.gtin}\u001f${identity.serial}`),
  );
  const conflicts: string[] = [];
  for (const entry of state.products) {
    if (bundleProductIds.has(entry.draft.id)) continue;
    for (const product of entry.published ? [entry.draft, entry.published] : [entry.draft]) {
      if (gtins.has(product.gtin)) conflicts.push(`GTIN:${product.gtin}`);
      if (brandSkus.has(`${product.brand}\u001f${product.sku}`))
        conflicts.push(`brand+SKU:${product.brand}/${product.sku}`);
    }
  }
  for (const identity of state.identities) {
    if (bundleUnitIds.has(identity.unitId)) continue;
    if (identities.has(`${identity.gtin}\u001f${identity.serial}`))
      conflicts.push(`GTIN+serial:${identity.gtin}/${identity.serial}`);
  }
  return conflicts;
}

export function loadMultiIndustryDemoData(
  current: DemoState,
  bundle = createMultiIndustryDemoBundle(),
): DemoLoadResult {
  const validation = validateMultiIndustryDemoBundle(bundle);
  if (validation.length)
    return {
      status: "blocked",
      state: current,
      addedProductIds: [],
      reason: "INVALID_DATASET",
      issues: validation.map((issue) => `${issue.code}:${issue.message}`),
    };
  const presence = datasetPresence(current, bundle);
  if (presence.present === presence.expectedCount && !presence.changed.length)
    return { status: "already-loaded", state: current, addedProductIds: [] };
  if (presence.present || presence.changed.length)
    return {
      status: "blocked",
      state: current,
      addedProductIds: [],
      reason: "DATASET_COLLISION",
      issues: presence.changed.length ? presence.changed : ["Partial dataset IDs already exist"],
    };
  const conflicts = identityConflicts(current, bundle);
  if (conflicts.length)
    return {
      status: "blocked",
      state: current,
      addedProductIds: [],
      reason: "IDENTITY_CONFLICT",
      issues: conflicts,
    };
  return {
    status: "loaded",
    state: {
      ...current,
      products: [...current.products, ...structuredClone(bundle.state.products)],
      contents: [...current.contents, ...structuredClone(bundle.state.contents)],
      batches: [...current.batches, ...structuredClone(bundle.state.batches)],
      units: [...current.units, ...structuredClone(bundle.state.units)],
      identities: [...current.identities, ...structuredClone(bundle.state.identities)],
      transparency: [...current.transparency, ...structuredClone(bundle.state.transparency)],
    },
    addedProductIds: bundle.state.products.map((entry) => entry.draft.id),
  };
}

function extraDependents(state: DemoState, bundle: MultiIndustryDemoBundle) {
  const ids = idSets(bundle);
  const issues: string[] = [];
  for (const content of state.contents)
    if (ids.products.has(content.productId) && !ids.contents.has(content.id))
      issues.push(content.id);
  for (const batch of state.batches)
    if (ids.products.has(batch.productId) && !ids.batches.has(batch.id)) issues.push(batch.id);
  for (const unit of state.units)
    if (
      (ids.products.has(unit.productId) || ids.batches.has(unit.batchId)) &&
      !ids.units.has(unit.id)
    )
      issues.push(unit.id);
  for (const identity of state.identities)
    if (ids.units.has(identity.unitId) && !ids.identities.has(identity.id))
      issues.push(identity.id);
  for (const association of state.transparency)
    if (ids.units.has(association.unitId) && !ids.transparency.has(association.id))
      issues.push(association.id);
  for (const record of state.records)
    if (
      ids.products.has(record.productId) ||
      (record.unitId !== undefined && ids.units.has(record.unitId))
    )
      issues.push(record.id);
  return issues;
}

export function resetMultiIndustryDemoData(
  current: DemoState,
  confirmation: { datasetId: string; phrase: string },
  bundle = createMultiIndustryDemoBundle(),
): DemoResetResult {
  if (
    confirmation.datasetId !== MULTI_INDUSTRY_DEMO_DATASET_ID ||
    confirmation.phrase !== MULTI_INDUSTRY_DEMO_RESET_PHRASE
  )
    return {
      status: "blocked",
      state: current,
      removedProductIds: [],
      reason: "CONFIRMATION_REQUIRED",
      issues: ["Exact dataset ID and reset phrase are required"],
    };
  const presence = datasetPresence(current, bundle);
  if (!presence.present) return { status: "not-loaded", state: current, removedProductIds: [] };
  if (presence.present !== presence.expectedCount || presence.changed.length)
    return {
      status: "blocked",
      state: current,
      removedProductIds: [],
      reason: "DATASET_MODIFIED_OR_PARTIAL",
      issues: presence.changed.length ? presence.changed : ["Dataset is only partially present"],
    };
  const dependents = extraDependents(current, bundle);
  if (dependents.length)
    return {
      status: "blocked",
      state: current,
      removedProductIds: [],
      reason: "DEPENDENT_DATA_EXISTS",
      issues: dependents,
    };
  const ids = presence.expected;
  return {
    status: "reset",
    state: {
      ...current,
      products: current.products.filter((entry) => !ids.products.has(entry.draft.id)),
      contents: current.contents.filter((entry) => !ids.contents.has(entry.id)),
      batches: current.batches.filter((entry) => !ids.batches.has(entry.id)),
      units: current.units.filter((entry) => !ids.units.has(entry.id)),
      identities: current.identities.filter((entry) => !ids.identities.has(entry.id)),
      transparency: current.transparency.filter((entry) => !ids.transparency.has(entry.id)),
    },
    removedProductIds: bundle.state.products.map((entry) => entry.draft.id),
  };
}

