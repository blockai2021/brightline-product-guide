import { z } from "zod";
import { normalizeGtin14, type Product } from "./domain";

export const DPP_CONTRACT_SCHEMA_VERSION = "1.0" as const;
export const DPP_STATUS_ENDPOINT_V1 = "/v1/products/{productId}/dpp-status" as const;
export const DPP_DEMO_CACHE_MAX_AGE_SECONDS = 60 as const;
export const DPP_DEMO_LABEL =
  "Demo DPP status · browser-local mock only · no remote service or SSO" as const;

const canonicalIdSchema = z
  .string()
  .min(1)
  .max(256)
  .refine((value) => value === value.trim(), "Identifier must not have surrounding whitespace");
const isoDateTimeSchema = z.string().datetime({ offset: true });
const normalizedGtin14Schema = z
  .string()
  .regex(/^\d{14}$/)
  .refine((value) => normalizeGtin14(value) === value, "GTIN must be normalized and valid");

export const productRefV1Schema = z
  .object({
    tenantId: canonicalIdSchema,
    productId: canonicalIdSchema,
    sku: z.string().min(1).optional(),
    gtin: normalizedGtin14Schema.optional(),
    externalProductId: z.string().min(1).optional(),
    brand: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    masterDataVersion: z.number().int().positive(),
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export type ProductRefV1 = z.infer<typeof productRefV1Schema>;

export const dppBusinessStatusV1Schema = z.enum([
  "NOT_STARTED",
  "IN_PROGRESS",
  "IN_REVIEW",
  "READY",
  "NEEDS_UPDATE",
]);
export type DppBusinessStatusV1 = z.infer<typeof dppBusinessStatusV1Schema>;

export const dppReadinessV1Schema = z
  .object({
    completed: z.number().int().nonnegative(),
    required: z.number().int().positive(),
    percentage: z.number().min(0).max(100),
    calculationVersion: z.string().min(1),
  })
  .strict()
  .refine((value) => value.completed <= value.required, {
    message: "Completed fields cannot exceed required fields",
  });

export const dppTemplateRefV1Schema = z
  .object({
    id: canonicalIdSchema,
    version: z.string().min(1),
    jurisdiction: z.string().min(1),
    sector: z.string().min(1),
  })
  .strict();

const dppStatusBaseV1Schema = z.object({
  schemaVersion: z.literal(DPP_CONTRACT_SCHEMA_VERSION),
  productId: canonicalIdSchema,
  tenantId: canonicalIdSchema,
});

const dppNotStartedStatusV1Schema = dppStatusBaseV1Schema
  .extend({
    profileId: z.null(),
    status: z.literal("NOT_STARTED"),
    readiness: z.null(),
    template: z.null(),
    updatedAt: z.null(),
  })
  .strict();

const dppProfileStatusV1Schema = dppStatusBaseV1Schema
  .extend({
    profileId: canonicalIdSchema,
    status: z.enum(["IN_PROGRESS", "IN_REVIEW", "READY", "NEEDS_UPDATE"]),
    readiness: dppReadinessV1Schema,
    template: dppTemplateRefV1Schema,
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export const dppStatusV1Schema = z.discriminatedUnion("status", [
  dppNotStartedStatusV1Schema,
  dppProfileStatusV1Schema,
]);
export type DppStatusV1 = z.infer<typeof dppStatusV1Schema>;

export const dppTechnicalErrorV1Schema = z.discriminatedUnion("code", [
  z.object({ code: z.literal("UNAUTHENTICATED"), httpStatus: z.literal(401) }).strict(),
  z.object({ code: z.literal("FORBIDDEN"), httpStatus: z.literal(403) }).strict(),
  z.object({ code: z.literal("NOT_FOUND"), httpStatus: z.literal(404) }).strict(),
  z
    .object({
      code: z.literal("UNAVAILABLE"),
      httpStatus: z.literal(503),
      reason: z.enum(["SERVICE_UNAVAILABLE", "TIMEOUT"]),
    })
    .strict(),
]);
export type DppTechnicalErrorV1 = z.infer<typeof dppTechnicalErrorV1Schema>;

export type DppIntegrationSourceV1 =
  { integration: "DEMO_MOCK"; demoLabel: typeof DPP_DEMO_LABEL } | { integration: "REMOTE" };
export type DppStatusResultV1 = DppIntegrationSourceV1 &
  (
    | {
        ok: true;
        cacheMaxAgeSeconds: number;
        data: DppStatusV1;
      }
    | {
        ok: false;
        error: DppTechnicalErrorV1;
      }
  );

export interface DppStatusAdapterV1 {
  readonly integration: "DEMO_MOCK" | "REMOTE";
  readonly cacheMaxAgeSeconds: number;
  getStatus(productId: string): Promise<DppStatusResultV1>;
  getStatuses(productIds: readonly string[]): Promise<readonly DppStatusResultV1[]>;
}

export type DemoDppSessionV1 =
  | { authenticated: false }
  | {
      authenticated: true;
      tenantId: string;
      authorizedProductIds?: readonly string[];
    };

export type DemoDppStatusAdapterConfigV1 = {
  session: DemoDppSessionV1;
  products: readonly ProductRefV1[];
  statuses?: readonly DppStatusV1[];
  unavailableProductIds?: readonly string[];
  timeoutProductIds?: readonly string[];
};

function optionalNonEmpty(value: string | undefined) {
  return value?.trim() ? value : undefined;
}

/** Maps the existing immutable Product.id directly; it never rewrites Product or DemoState. */
export function productRefV1FromProduct(
  product: Product,
  metadata: { tenantId: string; masterDataVersion: number; updatedAt: string },
): ProductRefV1 {
  const gtin = normalizeGtin14(product.gtin);
  return productRefV1Schema.parse({
    tenantId: metadata.tenantId,
    productId: product.id,
    masterDataVersion: metadata.masterDataVersion,
    updatedAt: metadata.updatedAt,
    ...(optionalNonEmpty(product.sku) ? { sku: product.sku } : {}),
    ...(gtin ? { gtin } : {}),
    ...(optionalNonEmpty(product.externalProductId)
      ? { externalProductId: product.externalProductId }
      : {}),
    ...(optionalNonEmpty(product.brand) ? { brand: product.brand } : {}),
    ...(optionalNonEmpty(product.model) ? { model: product.model } : {}),
  });
}

function mockSuccess(data: DppStatusV1): DppStatusResultV1 {
  return {
    ok: true,
    integration: "DEMO_MOCK",
    demoLabel: DPP_DEMO_LABEL,
    cacheMaxAgeSeconds: DPP_DEMO_CACHE_MAX_AGE_SECONDS,
    data: structuredClone(data),
  };
}

function mockError(error: DppTechnicalErrorV1): DppStatusResultV1 {
  return { ok: false, integration: "DEMO_MOCK", demoLabel: DPP_DEMO_LABEL, error };
}

function compositeProductKey(tenantId: string, productId: string) {
  return `${tenantId}\u001f${productId}`;
}

/**
 * Session-scoped browser demo only. It does not use localStorage as cross-origin sync,
 * call a remote DPP service, or claim shared authentication/authorization.
 */
export function createDemoDppStatusAdapter(
  config: DemoDppStatusAdapterConfigV1,
): DppStatusAdapterV1 {
  const session = config.session;
  const products = config.products.map((product) => productRefV1Schema.parse(product));
  const statuses = (config.statuses ?? []).map((status) => dppStatusV1Schema.parse(status));
  const productKeys = new Set<string>();
  for (const product of products) {
    const key = compositeProductKey(product.tenantId, product.productId);
    if (productKeys.has(key)) throw new Error("Duplicate tenantId + productId in DPP mock");
    productKeys.add(key);
  }
  const statusByProduct = new Map<string, DppStatusV1>();
  for (const status of statuses) {
    const key = compositeProductKey(status.tenantId, status.productId);
    if (!productKeys.has(key)) throw new Error("DPP mock status references an unknown product");
    if (statusByProduct.has(key)) throw new Error("Duplicate DPP mock status");
    statusByProduct.set(key, status);
  }
  const unavailable = new Set(config.unavailableProductIds ?? []);
  const timeouts = new Set(config.timeoutProductIds ?? []);
  const authorized =
    session.authenticated && session.authorizedProductIds
      ? new Set(session.authorizedProductIds)
      : undefined;

  async function getStatus(productId: string): Promise<DppStatusResultV1> {
    if (!session.authenticated) return mockError({ code: "UNAUTHENTICATED", httpStatus: 401 });
    const id = canonicalIdSchema.safeParse(productId);
    if (!id.success) return mockError({ code: "NOT_FOUND", httpStatus: 404 });
    const sameTenant = products.find(
      (product) => product.tenantId === session.tenantId && product.productId === productId,
    );
    if (!sameTenant) {
      return products.some((product) => product.productId === productId)
        ? mockError({ code: "FORBIDDEN", httpStatus: 403 })
        : mockError({ code: "NOT_FOUND", httpStatus: 404 });
    }
    if (authorized && !authorized.has(productId))
      return mockError({ code: "FORBIDDEN", httpStatus: 403 });
    if (timeouts.has(productId))
      return mockError({ code: "UNAVAILABLE", httpStatus: 503, reason: "TIMEOUT" });
    if (unavailable.has(productId))
      return mockError({
        code: "UNAVAILABLE",
        httpStatus: 503,
        reason: "SERVICE_UNAVAILABLE",
      });
    const status = statusByProduct.get(compositeProductKey(sameTenant.tenantId, productId));
    return mockSuccess(
      status ?? {
        schemaVersion: DPP_CONTRACT_SCHEMA_VERSION,
        productId,
        tenantId: sameTenant.tenantId,
        profileId: null,
        status: "NOT_STARTED",
        readiness: null,
        template: null,
        updatedAt: null,
      },
    );
  }

  return {
    integration: "DEMO_MOCK",
    cacheMaxAgeSeconds: DPP_DEMO_CACHE_MAX_AGE_SECONDS,
    getStatus,
    getStatuses: (productIds) => Promise.all(productIds.map(getStatus)),
  };
}

function normalizeAllowedOrigin(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("Invalid DPP allowlisted origin");
  return url.origin;
}

function assertDeepLinkProductId(productId: string) {
  const result = canonicalIdSchema.safeParse(productId);
  if (!result.success || productId === "." || productId === "..")
    throw new Error("Invalid DPP productId");
  return productId;
}

function encodePathSegment(value: string) {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function buildDppStatusEndpointPath(productId: string) {
  return `/v1/products/${encodePathSegment(assertDeepLinkProductId(productId))}/dpp-status`;
}

export function buildDppProductDeepLink(input: {
  baseUrl: string;
  allowedOrigins: readonly string[];
  productId: string;
}) {
  const base = new URL(input.baseUrl);
  const allowedOrigins = input.allowedOrigins.map(normalizeAllowedOrigin);
  if (
    base.protocol !== "https:" ||
    base.username ||
    base.password ||
    base.pathname !== "/" ||
    base.search ||
    base.hash ||
    !allowedOrigins.includes(base.origin)
  )
    throw new Error("Untrusted DPP base URL");
  return `${base.origin}/products/${encodePathSegment(assertDeepLinkProductId(input.productId))}`;
}

export function parseDppProductDeepLink(urlValue: string, allowedOrigins: readonly string[]) {
  const url = new URL(urlValue);
  const trusted = allowedOrigins.map(normalizeAllowedOrigin);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !trusted.includes(url.origin)
  )
    throw new Error("Untrusted DPP deep link");
  const match = /^\/products\/([^/]+)$/.exec(url.pathname);
  if (!match?.[1]) throw new Error("Invalid DPP deep link path");
  try {
    return assertDeepLinkProductId(decodeURIComponent(match[1]));
  } catch {
    throw new Error("Invalid DPP deep link productId");
  }
}

