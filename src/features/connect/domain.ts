export type Locale = "en" | "de" | "zh";
export type Localized = Record<Locale, string>;
export type IdentifierClaimStatus = "Demo" | "Format valid · unverified" | "Verified by GS1";
export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  model: string;
  sku: string;
  gtin: string;
  gtinStatus: IdentifierClaimStatus;
  asin: string;
  image: string;
  description: Localized;
  manual: Localized;
  video: string;
  faq: Localized;
  manufacturer: string;
  materials: string;
  specs: string;
  publishedAt?: string;
};
export type ProductEntry = { draft: Product; published?: Product };
export type ProductContent = {
  id: string;
  productId: string;
  version: number;
  state: "Draft" | "Published";
  description: Localized;
  manual: Localized;
  faq: Localized;
  video: string;
  createdAt: string;
  publishedAt?: string;
};
export type ProductionBatch = {
  id: string;
  productId: string;
  batchNumber: string;
  productionDate?: string;
  status: "Draft" | "Active" | "Closed";
};
export type ProductUnit = {
  id: string;
  productId: string;
  batchId: string;
  serial: string;
  status: "Created" | "Labelled" | "Activated" | "Retired";
  createdAt: string;
};
export type DigitalIdentity = {
  id: string;
  unitId: string;
  gtin: string;
  serial: string;
  canonicalPath: string;
  issuedAt: string;
};
export type TransparencyAssociation = {
  id: string;
  unitId: string;
  state: "Not enrolled" | "Amazon-issued code" | "Amazon-accepted existing serial";
  evidence: "Simulated" | "Pending" | "Confirmed";
  externalReference?: string;
};
export type Campaign = {
  id: string;
  title: Localized;
  city: string;
  date: string;
  description: Localized;
  status: "Draft" | "Published" | "Closed";
};
export type RecordEntry = {
  id: string;
  productId: string;
  unitId?: string;
  name: string;
  email: string;
  serial: string;
  date: string;
  kind: "Warranty" | "Support" | "Event";
  details: string;
  status: "New" | "In progress" | "Resolved";
  eventId?: string;
};
export type Consent = { email: string; active: boolean; updatedAt: string };
export type DemoState = {
  schemaVersion: 2;
  products: ProductEntry[];
  contents: ProductContent[];
  batches: ProductionBatch[];
  units: ProductUnit[];
  identities: DigitalIdentity[];
  transparency: TransparencyAssociation[];
  campaigns: Campaign[];
  records: RecordEntry[];
  consents: Consent[];
  visits: number;
};
export type UnitInputRejection = {
  index: number;
  serial: string;
  reason: "Invalid AI (21) serial" | "Duplicate in input" | "Duplicate GTIN + serial";
};
export type CreateProductUnitsResult = {
  state: DemoState;
  created: ProductUnit[];
  rejected: UnitInputRejection[];
};
export type GenerateSerialCandidatesResult =
  | { ok: true; serials: string[] }
  | {
      ok: false;
      code: "INVALID_PREFIX" | "INVALID_START" | "INVALID_COUNT" | "SERIAL_OVERFLOW";
      message: string;
    };
export const DEMO_DIGITAL_LINK_BASE_URL = "https://id.product-icode.example";
export class UnitIdentityError extends Error {
  constructor(
    readonly code:
      | "PRODUCT_NOT_FOUND"
      | "BATCH_NOT_FOUND"
      | "BATCH_PRODUCT_MISMATCH"
      | "INVALID_GTIN"
      | "ISSUED_GTIN_IMMUTABLE",
  ) {
    super(code);
  }
}
const AI21_PATTERN = /^[0-9A-Za-z!%&+,./_*'();:<=>?"-]{1,20}$/;
export function normalizeGtin14(value: string): string | null {
  if (!/^\d{8}$|^\d{12,14}$/.test(value)) return null;
  const gtin = value.padStart(14, "0");
  const body = gtin.slice(0, -1);
  const sum = [...body]
    .reverse()
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === Number(gtin.at(-1)) ? gtin : null;
}
export function isValidAi21Serial(value: string) {
  return AI21_PATTERN.test(value);
}
export function encodeGs1PathSegment(value: string) {
  if (!isValidAi21Serial(value)) throw new Error("Invalid GS1 AI (21) serial");
  return encodeURIComponent(value)
    .replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%[0-9a-f]{2}/g, (encoded) => encoded.toUpperCase());
}
export function buildDigitalLinkPath(gtin: string, serial: string) {
  const normalized = normalizeGtin14(gtin);
  if (!normalized) throw new Error("Invalid GTIN");
  return `/01/${normalized}/21/${encodeGs1PathSegment(serial)}`;
}
export function generateSerialCandidates(input: {
  prefix: string;
  start: number;
  count: number;
  maxCount?: number;
}): GenerateSerialCandidatesResult {
  const maxCount = input.maxCount ?? 1000;
  if (input.prefix && !isValidAi21Serial(input.prefix))
    return {
      ok: false,
      code: "INVALID_PREFIX",
      message: "Prefix contains invalid AI (21) characters.",
    };
  if (!Number.isSafeInteger(input.start) || input.start < 0)
    return { ok: false, code: "INVALID_START", message: "Start must be a non-negative integer." };
  if (!Number.isSafeInteger(input.count) || input.count < 1 || input.count > maxCount)
    return {
      ok: false,
      code: "INVALID_COUNT",
      message: `Count must be between 1 and ${maxCount}.`,
    };
  if (input.start > Number.MAX_SAFE_INTEGER - (input.count - 1))
    return {
      ok: false,
      code: "SERIAL_OVERFLOW",
      message: "Generated serial number exceeds the safe integer limit.",
    };
  const serials = Array.from(
    { length: input.count },
    (_, index) => `${input.prefix}${String(input.start + index).padStart(6, "0")}`,
  );
  if (serials.some((serial) => !isValidAi21Serial(serial)))
    return {
      ok: false,
      code: "SERIAL_OVERFLOW",
      message: "Generated serials exceed the GS1 AI (21) limit.",
    };
  return { ok: true, serials };
}
function validateBrandSlug(value: string) {
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(value) || /^\d{2,4}$/.test(value))
    throw new Error("Invalid brand slug");
  return value;
}
export function buildBrandedDigitalLinkUri(input: {
  baseUrl: string;
  brandSlug: string;
  gtin: string;
  serial?: string;
  trustedHosts?: readonly string[];
}) {
  const base = new URL(input.baseUrl);
  const trustedHosts = input.trustedHosts ?? [new URL(DEMO_DIGITAL_LINK_BASE_URL).hostname];
  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.port ||
    base.pathname !== "/" ||
    base.search ||
    base.hash ||
    !trustedHosts.includes(base.hostname)
  )
    throw new Error("Untrusted Digital Link base URL");
  const brandSlug = validateBrandSlug(input.brandSlug);
  const gtin = normalizeGtin14(input.gtin);
  if (!gtin) throw new Error("Invalid GTIN");
  const identityPath = input.serial ? buildDigitalLinkPath(gtin, input.serial) : `/01/${gtin}`;
  return `${base.origin}/${brandSlug}${identityPath}`;
}
function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function buildUnitExportCsv(
  state: DemoState,
  input: {
    productId: string;
    batchId: string;
    baseUrl: string;
    brandSlug: string;
    trustedHosts?: readonly string[];
  },
) {
  const product = state.products.find((entry) => entry.draft.id === input.productId)?.draft;
  const batch = state.batches.find(
    (entry) => entry.id === input.batchId && entry.productId === input.productId,
  );
  if (!product || !batch) throw new Error("Invalid product or batch export scope");
  const rows = state.units
    .filter((unit) => unit.productId === product.id && unit.batchId === batch.id)
    .map((unit) => {
      const identity = state.identities.find((entry) => entry.unitId === unit.id);
      if (!identity) return null;
      return [
        product.id,
        product.sku,
        batch.id,
        batch.batchNumber,
        identity.gtin,
        identity.serial,
        buildBrandedDigitalLinkUri({
          baseUrl: input.baseUrl,
          brandSlug: input.brandSlug,
          gtin: identity.gtin,
          serial: identity.serial,
          ...(input.trustedHosts ? { trustedHosts: input.trustedHosts } : {}),
        }),
      ]
        .map(csvCell)
        .join(",");
    })
    .filter((row): row is string => Boolean(row));
  return ["productId,SKU,batchId,batch,GTIN,serial,absoluteUri", ...rows].join("\r\n");
}
export function findUnitByIdentity(state: DemoState, gtin: string, serial: string) {
  const normalized = normalizeGtin14(gtin);
  if (!normalized || !isValidAi21Serial(serial)) return undefined;
  const identity = state.identities.find(
    (item) => item.gtin === normalized && item.serial === serial,
  );
  return identity ? state.units.find((unit) => unit.id === identity.unitId) : undefined;
}
export function createProductUnits(
  state: DemoState,
  input: { productId: string; batchId: string; serials: string[] },
  dependencies: { createId?: () => string; now?: () => string } = {},
): CreateProductUnitsResult {
  const product = state.products.find((entry) => entry.draft.id === input.productId)?.draft;
  if (!product) throw new UnitIdentityError("PRODUCT_NOT_FOUND");
  const batch = state.batches.find((entry) => entry.id === input.batchId);
  if (!batch) throw new UnitIdentityError("BATCH_NOT_FOUND");
  if (batch.productId !== product.id) throw new UnitIdentityError("BATCH_PRODUCT_MISMATCH");
  const gtin = normalizeGtin14(product.gtin);
  if (!gtin) throw new UnitIdentityError("INVALID_GTIN");
  const createId = dependencies.createId || (() => crypto.randomUUID());
  const now = (dependencies.now || (() => new Date().toISOString()))();
  const seen = new Set<string>();
  const accepted: Array<{ index: number; serial: string }> = [];
  const rejected: UnitInputRejection[] = [];
  input.serials.forEach((serial, index) => {
    if (!isValidAi21Serial(serial)) {
      rejected.push({ index, serial, reason: "Invalid AI (21) serial" });
      return;
    }
    if (seen.has(serial)) {
      rejected.push({ index, serial, reason: "Duplicate in input" });
      return;
    }
    seen.add(serial);
    if (state.identities.some((identity) => identity.gtin === gtin && identity.serial === serial)) {
      rejected.push({ index, serial, reason: "Duplicate GTIN + serial" });
      return;
    }
    accepted.push({ index, serial });
  });
  const created = accepted.map(({ serial }) => ({
    id: `unit-${createId()}`,
    productId: product.id,
    batchId: batch.id,
    serial,
    status: "Created" as const,
    createdAt: now,
  }));
  const identities = created.map((unit) => ({
    id: `identity-${createId()}`,
    unitId: unit.id,
    gtin,
    serial: unit.serial,
    canonicalPath: buildDigitalLinkPath(gtin, unit.serial),
    issuedAt: now,
  }));
  const transparency = created.map((unit) => ({
    id: `transparency-${createId()}`,
    unitId: unit.id,
    state: "Not enrolled" as const,
    evidence: "Simulated" as const,
  }));
  return {
    state: {
      ...state,
      units: [...created, ...state.units],
      identities: [...identities, ...state.identities],
      transparency: [...transparency, ...state.transparency],
    },
    created,
    rejected,
  };
}
export function assertIssuedGtinUnchanged(state: DemoState, product: Product) {
  const issuedGtins = new Set(
    state.units
      .filter((unit) => unit.productId === product.id)
      .flatMap((unit) => state.identities.filter((identity) => identity.unitId === unit.id))
      .map((identity) => identity.gtin),
  );
  if (!issuedGtins.size) return;
  const nextGtin = normalizeGtin14(product.gtin);
  if (!nextGtin || issuedGtins.size !== 1 || !issuedGtins.has(nextGtin))
    throw new UnitIdentityError("ISSUED_GTIN_IMMUTABLE");
}
export function publishProduct(state: DemoState, product: Product): DemoState {
  assertIssuedGtinUnchanged(state, product);
  const publishedAt = new Date().toISOString();
  const snapshot = {
    ...product,
    description: { ...product.description },
    manual: { ...product.manual },
    faq: { ...product.faq },
    publishedAt,
  };
  const version =
    Math.max(
      0,
      ...state.contents
        .filter((content) => content.productId === product.id && content.state === "Published")
        .map((content) => content.version),
    ) + 1;
  return {
    ...state,
    products: state.products.map((p) =>
      p.draft.id === product.id ? { draft: product, published: snapshot } : p,
    ),
    contents: [
      ...state.contents,
      {
        id: `${product.id}-content-v${version}`,
        productId: product.id,
        version,
        state: "Published",
        description: { ...product.description },
        manual: { ...product.manual },
        faq: { ...product.faq },
        video: product.video,
        createdAt: publishedAt,
        publishedAt,
      },
    ],
  };
}
export function saveDraft(state: DemoState, product: Product): DemoState {
  assertIssuedGtinUnchanged(state, product);
  const exists = state.products.some((p) => p.draft.id === product.id);
  return {
    ...state,
    products: exists
      ? state.products.map((p) => (p.draft.id === product.id ? { ...p, draft: product } : p))
      : [...state.products, { draft: product }],
  };
}
export function registerEvent(state: DemoState, record: RecordEntry): DemoState {
  const event = state.campaigns.find((e) => e.id === record.eventId);
  if (!event || event.status !== "Published")
    throw new Error("Event is not accepting registrations");
  if (
    state.records.some(
      (r) => r.kind === "Event" && r.eventId === record.eventId && r.email === record.email,
    )
  )
    throw new Error("Already registered");
  return { ...state, records: [record, ...state.records] };
}
export function setConsent(state: DemoState, email: string, active: boolean): DemoState {
  return {
    ...state,
    consents: [
      ...state.consents.filter((c) => c.email !== email),
      { email, active, updatedAt: new Date().toISOString() },
    ],
  };
}

