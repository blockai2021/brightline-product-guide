# Product iCode — Connect ↔ DPP Integration Contracts V1.0

Status: **PROPOSED / REVIEW REQUIRED** (2026-11-14). No independent DPP service, shared database, or SSO is claimed to be deployed.

## Architecture boundary

- **Connect** owns product master identifiers, SKU/GTIN, batches, units, serialization, QR and consumer workflows.
- **DPP platform** owns DPP profiles, applicable data templates, field values, evidence, validation, review and DPP-specific publication snapshots.
- **Shared platform services** own authenticated user, tenant membership, authorization, product catalog read APIs and contract versioning.
- Connect displays externally calculated DPP readiness **read-only**, and links to the independent DPP management application.
- No DPP form on Connect should use `saveDraft`/`publishProduct` for edits to DPP-specific values. Existing `manufacturer`, `materials`, `specs` on Product are historical Connect draft fields; define field ownership/migration before replacing.

## Contract 1 — Product identity

Source of truth: Product iCode shared product registry (Connect until extraction). The existing `Product.id` remains unchanged during migration. New production products should have globally unique immutable IDs (UUIDv7 recommended); preserve old IDs with a mapping table. Do not derive primary identity from mutable SKU, product slug or GTIN.

```ts
type ProductRefV1 = {
  tenantId: string;          // authenticated tenancy, not trusted from request alone
  productId: string;         // canonical immutable global product ID
  sku?: string;
  gtin?: string;             // 14-digit normalized only when valid
  externalProductId?: string;
  brand?: string;
  model?: string;
  masterDataVersion: number; // monotonic revision number
  updatedAt: string;         // ISO 8601
}
```

Rules:
1. Canonical identity is (tenantId, productId); authorize on both. IDs alone are not proof of access.
2. A DppProfile references an existing product by tenantId + productId, never duplicates product master records.
3. `Product.id` in `src/features/connect/domain.ts` maps directly to `productId`. Batch/Unit use the same foreign key.
4. Product name/brand/SKU/GTIN edits in Connect update master data only. DPP reads latest data; no automatic overwrite of evidence/reviewed data.
5. Missing product => 404; wrong tenant or unauthorized => 403 or intentionally masked 404 per access policy.
6. Server-side identity uniqueness and lifecycle rules are required; localStorage identifiers cannot provide cross-browser uniqueness.

## Contract 2 — Read-only DPP status API

Base path `/v1`. JSON UTF-8. Endpoints:
- `GET /v1/products/{productId}/dpp-status` (authorized tenant from session, no tenantId URL query)
- `GET /v1/products/dpp-status?limit=50&cursor=...` optional, bulk list response to avoid N+1

```json
{
  "schemaVersion": "1.0",
  "productId": "product-001",
  "tenantId": "tenant-001",
  "profileId": "dpp-001",
  "status": "IN_PROGRESS",
  "readiness": {
    "completed": 18,
    "required": 30,
    "percentage": 60,
    "calculationVersion": "1"
  },
  "template": {
    "id": "template-001",
    "version": "1.0",
    "jurisdiction": "EU",
    "sector": "example"
  },
  "updatedAt": "2026-11-14T12:00:00Z"
}
```

Business statuses:
- `NOT_STARTED`: no DPP profile yet (can use a typed response with profileId=null).
- `IN_PROGRESS`: collecting or correcting data.
- `IN_REVIEW`: pending review.
- `READY`: passes **internal readiness policy for specific template/version**, **not legal certification**.
- `NEEDS_UPDATE`: relevant product/evidence/template change requires fresh review.

Technical state is separate from business status:
- 401 unauthenticated, 403 forbidden, 404 product not found, 503/timeout unavailable.
- Connect shows unavailable/unknown instead of falsely rendering `NOT_STARTED` or `READY`.
- Data freshness: client cache max 60 seconds for demo; after DPP update, invalidate/re-fetch. Expose `updatedAt` and optionally ETag.
- Pagination/bulk queries must enforce tenant permissions and return only authorized products.
- Readiness formula is template-specific: `completed / required * 100`, required>0, count only fields satisfying template's validation policy; round per UI, never infer compliance.

Response when profile absent (HTTP 200 if product exists):
```json
{"schemaVersion":"1.0","productId":"product-001","tenantId":"tenant-001","profileId":null,"status":"NOT_STARTED","readiness":null,"template":null,"updatedAt":null}
```

DPP service is sole writer of DPP profiles and readiness statuses. Connect may display link and summary but must not edit status.

## Contract 3 — Login, access and deep-link

Planned canonical DPP deep link (domain not yet provisioned):
`https://dpp.product-icode.com/products/{encodeURIComponent(productId)}`

- Browser navigation only carries the productId. **Never put access/refresh tokens or API keys into query strings.**
- Production auth via shared OIDC provider using Authorization Code + PKCE. Both apps use separate OIDC clients and validate sessions. Authentication and product/tenant authorization are separate.
- Logged in and authorized => open product workspace.
- Logged out => auth redirect, then restore intended product URL.
- Unauthorized => 403 (or masked 404 by documented policy).
- Profile absent => DPP workspace offers `Create DPP profile` for authorized users; no duplicate product creation.
- Unknown product => 404 with return link.
- Return to Connect uses an allowlisted URL template, not arbitrary untrusted `returnUrl`.
- User interface should show tenant/account context when navigating to mitigate cross-tenant confusion.
- Demo mode may use documented mock status and link to demo DPP route, but **never claim SSO or remote shared data is working**. Separate origins cannot share localStorage.

## Example UI flow

Connect Products -> product row's DPP status -> `Manage DPP` link -> DPP app product detail, same productId; DPP app shows current master fields read-only and its own editable DPP data. Back navigation to Connect product detail. DPP status should be shown on both Connect DPP Ready overview and Products detail if requested.

## Data integrity / versioning

- Product master carries `masterDataVersion`. When master data changes and DPP validation relies on those fields, DPP flags `NEEDS_UPDATE` until reconciled.
- DPP revisions and evidence survive changes to name/SKU/description.
- DPP status API version must be stable (`/v1`, `schemaVersion`), backward compatible when adding optional properties; breaking changes require /v2.
- Avoid editing GTIN/identity on issued product units; existing `assertIssuedGtinUnchanged` behavior must remain intact.

## Implementation ownership / acceptance

**Codex (P0):**
1. Define TypeScript/OpenAPI schemas, validation and contract tests; add mocked status adapter with explicit demo labels.
2. Keep existing V2 localStorage migrations safe; plan C-005 shared DB/tenant auth integration rather than pretending it exists.
3. Add secure link builder (configured allowlisted DPP base URL); tests for ID roundtrip, no token leakage, no cross-tenant access.
4. Document DPP provider boundary and exceptions. Do not introduce new DPP product editor in Connect.

**Lovable (P0):**
1. Connect `/admin/dpp` becomes read-only linked product list: product, SKU, GTIN, business readiness status, updatedAt, Manage DPP.
2. Add DPP status + Manage DPP link to Products detail where appropriate.
3. For `NOT_STARTED`, button `Set up DPP`; for unavailable state, show `Unavailable` and retry, never misrepresent readiness.
4. Any separate DPP Lovable project consumes contracts and resolves `/products/:productId` without re-creating Product.
5. Mobile/table UX, QA screenshots and build. No changes to product/identity/print business logic.

**Cross-project acceptance:**
- Given an existing productId, both views show same product.
- Changing Connect product name reflects in DPP after refresh (only with shared API; mock must be labeled).
- DPP status update reflects in Connect upon re-fetch (only with shared API; mock must be labeled).
- 401/403/404/unavailable/NOT_STARTED handled distinctly.
- No customer cross-tenant exposure.
- No tokens in URLs, no localStorage used as cross-origin sync.
- Separate platform deployment / URL remains configurable.

## Existing code references (2026-11-14)

- `src/features/connect/domain.ts`: `Product.id`, `ProductEntry`, `ProductionBatch.productId`, `ProductUnit.productId`.
- `src/features/connect/store.tsx`: `icode-connect-demo-v2` localStorage.
- `src/features/connect/admin.tsx`: `Dpp()` currently edits `manufacturer/materials/specs` via `saveDraft` and `publishProduct`; change/remove this cross-domain editing behavior.
- `src/features/connect/product-catalog.tsx`: product listing.
