# Product iCode Connect V1.1 multi-industry demo data

Status: implementation design for browser-local demonstration and automated tests. It is not a production seed, GS1 allocation record, customer database, certification record or legal DPP.

## Scope and ownership

The V1.1 fixture is an optional bundle outside `initialState()`. It reuses the V1.0 `ProductEntry`, `ProductContent`, `ProductionBatch`, `ProductUnit`, `DigitalIdentity`, `TransparencyAssociation`, `ProductRefV1` and `DppStatusV1` contracts. It does not add fields to `DemoState`, change schema version 2, or read/write `icode-connect-demo-v2` directly.

Lovable may add an explicit load/reset control later. UI integration must call the pure functions through the existing repository provider and must show the manifest/marker warning. Merely opening a page must never load or reset the bundle.

## Dataset matrix

| Industry        | Product scenario                                              | Units | DPP scenario   | Consumer content                                    |
| --------------- | ------------------------------------------------------------- | ----: | -------------- | --------------------------------------------------- |
| Smart home      | Synthetic environment sensor                                  |     3 | `IN_PROGRESS`  | Published EN/DE/ZH demo description, manual and FAQ |
| Safety footwear | Synthetic protective shoe, explicitly not certified PPE       |     3 | `IN_REVIEW`    | Published EN/DE/ZH demo description, manual and FAQ |
| Battery         | Synthetic rechargeable module, no verified chemistry/capacity |     3 | `NEEDS_UPDATE` | Published EN/DE/ZH demo description, manual and FAQ |

All timestamps, IDs, batches and serials are deterministic. The bundle contains no warranty/support/event records, consents, consumer names, email addresses, campaigns or visit counts.

## Identifier policy

- Product, batch, unit, identity and profile IDs use the `demo-v11-*` namespace.
- Product names begin with `[DEMO]`; `Product.gtinStatus` remains `Demo`.
- GTIN values are check-digit-valid solely so the existing identity and Digital Link rules can be exercised. The manifest and every product marker state `FORMAT_VALID_SYNTHETIC_NOT_GS1_ASSIGNED` and `claimsGs1Assignment=false`.
- The values must never be presented as allocated GS1 identifiers, printed on commercial goods, submitted to a marketplace, or used for real traceability.
- Transparency remains `Not enrolled` with `Simulated` evidence. No Amazon-issued or official code is fabricated.

## Load and reset safety

`loadMultiIndustryDemoData(current)` is atomic and non-mutating:

1. Validate the whole bundle before merge.
2. Append only when no dataset IDs, GTIN, brand+SKU or GTIN+Serial collide.
3. Return `already-loaded` for an exact repeat without changing the state object.
4. Return `blocked` for partial, edited or conflicting data; never repair or overwrite browser data.

`resetMultiIndustryDemoData(current, confirmation)` removes only exact fixture entities. It requires the exact dataset ID plus `RESET V1.1 DEMO DATA`. Reset is blocked if fixture entities were modified, are only partially present, or acquired extra contents, batches, units, identities, transparency associations or consumer records. Existing products and unrelated browser data are preserved byte-for-byte.

## C-005 migration compatibility

- `Product.id` remains the canonical `productId`; `tenantId + productId` is carried in `ProductRefV1`.
- Deterministic demo IDs are fixture IDs, not the UUID policy for new production products.
- `masterDataVersion=1` and fixed `updatedAt` make the fixture import repeatable; a C-005 importer can map this bundle through a transaction and unique constraints without changing the domain fixture.
- Production reset must be an administrator-controlled seed cleanup operation, not a client-side delete. The pure reset result is only a browser-demo planning result.
- Formal tenant authorization, shared persistence, server uniqueness, audit logs and OIDC/PKCE remain C-005 responsibilities. This bundle must never be used to imply those services are deployed.

## Lovable integration contract

Lovable should consume:

- `createMultiIndustryDemoBundle()` for cards/previews and DPP mock configuration;
- `validateMultiIndustryDemoBundle()` before offering load;
- `loadMultiIndustryDemoData()` inside the existing provider update callback only after explicit user action;
- `resetMultiIndustryDemoData()` only after showing the exact confirmation phrase and all blocking reasons;
- `markers` and `manifest` for persistent Demo badges and warnings.

Do not create a second localStorage key as a cross-origin synchronization mechanism, and do not add a separate product/DPP editor for these fixtures.

