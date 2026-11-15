# L-014 Demo release metadata

Admin footer and Version & build dialog share one immutable build-info module.
No product, identity, DPP, QR or printing logic is changed.

## Metadata contract

- `VITE_APP_GIT_SHA`: full 40-character Git commit SHA, supplied **only by the actual build pipeline** for its source revision. No automatic Lovable SHA variable was verified in this task. Missing/invalid values display `Unknown`; do not set this manually to the latest main commit.
- `VITE_APP_VERSION`: approved product version. Unconfigured fallback `V0.1-demo` is explicitly provisional and pending owner approval; no V1 release is implied.
- `VITE_BUILD_TIME`: preserve an explicit pipeline timestamp if supplied, otherwise inject the Vite build clock as UTC ISO time, identical in SSR and browser bundles. Development has no build timestamp. It is not publication time. Timestamps must specify a timezone.
- `VITE_DEPLOY_TIME`: optional actual publication timestamp from the deployment pipeline, otherwise `Unknown`. Never infer it from build time or browser time.
- Environment is a presentation label derived after hydration from the exact site hostname: localhost = Development; Lovable preview host = Preview; the known published app host = Stable Demo; other hosts = Unknown. It is not proof of release approval or commit identity.

Build metadata is frozen in the app bundle. Updating GitHub main without publishing does not update the published bundle's metadata. A verified SHA source can later replace Unknown through CI injection; no runtime GitHub request or git HEAD fallback is allowed.

## Follow-up platform investigation

Official documentation does not document automatic `VITE_APP_GIT_SHA`, `VITE_BUILD_TIME` or `VITE_DEPLOY_TIME` for hosted builds. The publish API documents a deployment ID, status and URL but not source SHA or actual deployment timestamp. This is a limit of the verified interface, not proof that no internal metadata exists. Local variable absence alone does not establish hosted settings.

Sources: https://docs.lovable.dev/features/secrets#secrets-vs-vite_-environment-variables and https://docs.lovable.dev/api-reference/deploy-domains/publish-project .

The Vite helper loads explicit `VITE_` build inputs and injects only the three selected metadata values, never all environment values. Missing SHA and deploy time stay Unknown. It does not guess CI variable names.

Verifiable alternatives (not implemented integrations):

1. Keep an external release evidence record containing the publish deployment ID/status, observation time, site URL, displayed build timestamp and copied report. Observation time must not be called exact deployment time; preview SHA must not be called production SHA.
2. With a controlled deployment pipeline, build a pinned source checkout, pass that exact checkout SHA, archive the built artifact hash, and record the successful deployment ID and timestamp alongside it. Only the exact artifact-to-deployment linkage proves source identity. The final deployment time is normally known after build, so expose it via a deployment-generated release manifest, not a fabricated pre-build time. This requires a verified hosting/pipeline integration; it is not currently connected.
3. Keep `V0.1-demo` provisional until the product owner approves a version; missing infrastructure metadata cannot establish version approval.

Actual follow-up live inspection: the formal `/admin` returned HTTP 200, environment `Stable Demo`, build time `2026-11-15T00:27:43.518Z`, SHA/deploy time `Unknown`, and provisional `V0.1-demo`. The main hosted preview redirected to Lovable sign-in, so hosted-preview UI was not verified; preview hostname logic is covered by automated tests and localhost checks. The available preview record `br_5415f5bc-15c4-4f04-8508-df74fed9eebe` points to `3062a7a63d26b7921c0437ef42bb9b75e591b2d0` and is explicitly not a production record. No production SHA match is claimed.

After the follow-up publish request, the actual live check at `2026-11-15T00:37:48Z` returned HTTP 200 and copied back `Stable Demo`, `V0.1-demo` provisional, build time `2026-11-15T00:28:58.488Z`, SHA `Unknown`, deploy time `Unknown`. Desktop and Chinese mobile were checked without page errors or horizontal overflow. This build time predates the follow-up source commits (`30f12e0`, `98f388d`); available hosted build status still reports the previous source revision. Therefore publication of the new follow-up code is **not confirmed**, even though the existing production environment identification and timestamp work. Do not pair either timestamp with an inferred production SHA. All 109 tests and the automatic local build passed.

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