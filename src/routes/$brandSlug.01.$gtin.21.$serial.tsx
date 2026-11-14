import { createFileRoute } from "@tanstack/react-router";
import { Consumer } from "@/features/connect/consumer";
import { pageMeta } from "@/features/connect/meta";

export const Route = createFileRoute("/$brandSlug/01/$gtin/21/$serial")({
  component: BrandedUnitPage,
  head: () =>
    pageMeta(
      "Branded unit Digital Link",
      "Preview a brand-associated published product unit in the browser-local iCode Connect demo.",
    ),
});
function BrandedUnitPage() {
  const { brandSlug, gtin, serial } = Route.useParams();
  return <Consumer brandSlug={brandSlug} gtin={gtin} identitySerial={serial} />;
}
