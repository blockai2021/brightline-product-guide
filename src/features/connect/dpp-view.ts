import type { ProductEntry } from "./domain";
import { demoProduct } from "./seed";
import {
  buildDppProductDeepLink,
  createDemoDppStatusAdapter,
  productRefV1FromProduct,
  type DppStatusResultV1,
} from "./dpp-contracts";

// Explicit demo fixture metadata, not a product modification timestamp or live tenant session.
const demoMetadata = {
  tenantId: "connect-demo-tenant",
  masterDataVersion: 1,
  updatedAt: "2026-11-14T12:00:00Z",
};

export function createConnectDppDemoAdapter(products: readonly ProductEntry[]) {
  const refs = products.map(({ draft }) => productRefV1FromProduct(draft, demoMetadata));
  const sample = refs.find((ref) => ref.productId === demoProduct.id);
  return createDemoDppStatusAdapter({
    session: { authenticated: true, tenantId: demoMetadata.tenantId },
    products: refs,
    statuses: sample
      ? [
          {
            schemaVersion: "1.0",
            tenantId: sample.tenantId,
            productId: sample.productId,
            profileId: "connect-demo-dpp-airpure",
            status: "IN_PROGRESS",
            readiness: { completed: 18, required: 30, percentage: 60, calculationVersion: "1" },
            template: {
              id: "demo-template",
              version: "1.0",
              jurisdiction: "EU",
              sector: "example",
            },
            updatedAt: demoMetadata.updatedAt,
          },
        ]
      : [],
  });
}

export function dppResultKey(result: DppStatusResultV1) {
  return result.ok ? result.data.status : result.error.code;
}

export function configuredDppLink(
  productId: string,
  config: { baseUrl?: string | undefined; allowedOrigins?: string | undefined },
) {
  if (!config.baseUrl?.trim()) return { href: undefined, reason: "Dpp.noTarget" };
  try {
    const href = buildDppProductDeepLink({
      productId,
      baseUrl: config.baseUrl.trim(),
      allowedOrigins: (config.allowedOrigins ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    });
    return { href, reason: undefined };
  } catch {
    return { href: undefined, reason: "Dpp.invalidTarget" };
  }
}
