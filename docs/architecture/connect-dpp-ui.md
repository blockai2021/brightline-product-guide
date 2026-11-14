# Connect DPP status UI (L-012)

## Dependency and scope

C-008 PR #23 merged at commit `8760a3902cc421006e849f37741fe8384f166910`;
the implementation started from that same local and remote main commit.
Contracts V1.0 and `dpp-contracts.ts` remain the source of truth.

`/admin/dpp` reads existing product drafts by immutable `draft.id`. The list and
Products detail summary only read C-008 status results. They never write products,
publish snapshots, create units or modify DPP data. Search, status filtering,
pagination, refresh, localized timestamps and mobile stacked rows are presentation-only.

## Demo and future platform configuration

The browser-local adapter has one explicit IN_PROGRESS fixture for the seeded
AirPure product; other products return NOT_STARTED with a null profile and timestamp.
No readiness is calculated from Connect fields. The fixture timestamp is not a
product modification time. Five business statuses and 401/403/404/503 technical
results are handled separately, including offline/timeout retry. READY means
internal template readiness, not statutory EU certification.

For an independently deployed DPP platform, configure both public build settings:

- `VITE_DPP_BASE_URL`: approved HTTPS origin, without path/query/credentials.
- `VITE_DPP_ALLOWED_ORIGINS`: explicit comma-separated approved HTTPS origins.

The C-008 link builder creates `/products/{encoded productId}` only when both
settings validate; otherwise there is no generated link and the button is disabled.
Credentials are never included in links. Configuring a link alone does not connect
a status API, shared authentication, tenant authorization or cross-platform data.
Access-denied, missing-product and sign-in-required results disable navigation.
Status reads have a maximum 60-second freshness window and manual refresh.

Production integration and the independent application's return-to-Connect link
remain dependent on that service and shared authenticated platform APIs.