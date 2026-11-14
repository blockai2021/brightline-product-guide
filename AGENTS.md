<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.

<!-- LOVABLE:END -->

## Application architecture

- Use a typed browser-local demo repository through a shared React provider; isolate pure domain operations so a future API repository can replace persistence.
- Keep editable product drafts separate from immutable published snapshots; consumer pages read only published snapshots to prevent leaking unpublished edits.
- Use TanStack file routes for admin sections and a mobile-first consumer entry; both share the same repository and localized product types.
- Keep admin UI copy namespaced in the shared locale dictionaries and persist each audience's language independently after hydration; language changes must not alter domain values or editable content languages.
- Use one product editor with URL-addressable basic, content, units, links and publishing tabs; redirect the legacy content route to its content tab to preserve links and a single shared draft form.
- Keep QR artifacts and CSV parsing in a frontend helper; the unit panel reads persisted unit/identity associations and delegates serial generation, creation, URI construction and CSV escaping to the existing domain functions to avoid duplicate rules.
- Derive brand path slugs consistently from the published brand (draft only before first publication); resolve branded routes against that published brand and issued identities to prevent cross-brand or draft content exposure.
- Keep Transparency read-only for identity associations; its frontend table reducer clears selection on filters, and mapping exports compose the existing per-scope CSV helper so serialization rules stay centralized.
- Keep the product catalog and import wizard separate from the shared editor; delegate parsing, preview, matching and confirmed draft writes to C-007, with only presentation limits and exact alias suggestions in frontend helpers, to preserve issued identities and published snapshots.
- Keep printing in an independent product-scoped page and shared browser-local job provider; freeze CSV/manifest files at preparation, reuse core identity exports, and record export/manual confirmation separately so downloads never change unit states or issue identities.
- Serve canonical brand PNGs unchanged from the versioned public brand directory; derive only the small padded favicon from the icon original so source artwork stays byte-identical and consumer brand rendering stays separate.
- Keep DPP list and product summaries read-only, sharing C-008 adapters and React Query freshness after repository hydration; build independent-platform links only with an explicit HTTPS base and origin allowlist so demo data cannot imply remote sync or overwrite product drafts.
