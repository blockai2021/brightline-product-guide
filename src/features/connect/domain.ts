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
export function findUnitByIdentity(state: DemoState, gtin: string, serial: string) {
  const normalized = normalizeGtin14(gtin);
  if (!normalized || !isValidAi21Serial(serial)) return undefined;
  const identity = state.identities.find(
    (item) => item.gtin === normalized && item.serial === serial,
  );
  return identity ? state.units.find((unit) => unit.id === identity.unitId) : undefined;
}
export function publishProduct(state: DemoState, product: Product): DemoState {
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
