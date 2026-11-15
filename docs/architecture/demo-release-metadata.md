# L-014 Demo release metadata

Admin footer and Version & build dialog share one immutable build-info module.
No product, identity, DPP, QR or printing logic is changed.

## Metadata contract

- `VITE_APP_GIT_SHA`: full 40-character Git commit SHA, supplied **only by the actual build pipeline** for its source revision. No automatic Lovable SHA variable was verified in this task. Missing/invalid values display `Unknown`; do not set this manually to the latest main commit.
- `VITE_APP_VERSION`: approved product version. Unconfigured fallback `V0.1-demo` is explicitly provisional and pending owner approval; no V1 release is implied.
- `VITE_BUILD_TIME`: injected by the Vite build hook as UTC ISO time, identical in SSR and browser bundles. Development has no build timestamp. It is not publication time.
- `VITE_DEPLOY_TIME`: optional actual publication timestamp from the deployment pipeline, otherwise `Unknown`. Never infer it from build time or browser time.
- Environment is a presentation label derived after hydration from the exact site hostname: localhost = Development; Lovable preview host = Preview; the known published app host = Stable Demo; other hosts = Unknown. It is not proof of release approval or commit identity.

Build metadata is frozen in the app bundle. Updating GitHub main without publishing does not update the published bundle's metadata. A verified SHA source can later replace Unknown through CI injection; no runtime GitHub request or git HEAD fallback is allowed.

## Release record template (Feishu not connected)

Copy these fields into a release record; this task does not create or sync a Feishu table.

```text
Release ID:
Version (approval required for provisional label):
Environment:
Site URL: https://product-icode-platform.lovable.app/admin
Deployment Commit: Unknown unless supplied by verified build metadata
Code change commit (not proof of deployed commit):
Build time (UTC):
Actual publish time (UTC):
Verified features:
Known limitations: Browser-local Demo; simulated scans and DPP; no cloud database, SSO or production Resolver
Reviewer:
Release state: Draft / Pending review / Approved / Published / Archived / Rolled back
GitHub Issue: https://github.com/blockai2021/brightline-product-guide/issues/26
```

Only a Published release that has been checked at the actual live URL should be used as the internal testing baseline. Development, acceptance and publication are separate milestones. An Unknown SHA is honest fallback, not a verified match to the source commit. Preserve deployment tool evidence separately.

## Actual acceptance on 2026-11-15

- Code implementation commit: `a46e89ee0fe5a6cf25c9fa7df9510b299f350dc7` (not claimed as deployed SHA).
- Publication requested through Lovable; published settings confirm public/published.
- Actual live `/admin` returned HTTP 200 and the new version dialog at 00:27:56 UTC. Clipboard readback confirmed the complete report.
- Live version: `V0.1-demo` (provisional); environment: `Stable Demo`; build timestamp: `2026-11-15T00:27:43.518Z`; commit: `Unknown`; deploy timestamp: `Unknown`.
- Available CLI record confirms only the preview build of the implementation commit (`br_9fa54041-0522-4080-8249-76d2db365bf2`). It is not a production deployment SHA record. Exact production SHA matching remains unverified; no substitution was made. Keep that release verification in Review until a verified production build SHA/record is available.
- 104 tests passed; automatic build OK; targeted lint passed; English/Chinese/German and desktop/mobile copy/display verified. No business-domain modules were changed.