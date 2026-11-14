import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { Consumer } from "@/features/connect/consumer";
import { pageMeta } from "@/features/connect/meta";

export const Route = createFileRoute("/$brandSlug/01/$gtin")({
  component: BrandedModelPage,
  head: () =>
    pageMeta(
      "Branded model Digital Link",
      "Preview shared published model content through a brand-associated demo Digital Link.",
    ),
});
function BrandedModelPage() {
  const { brandSlug, gtin } = Route.useParams();
  const isUnit = useRouterState({
    select: (s) => s.matches.some((m) => m.routeId === "/$brandSlug/01/$gtin/21/$serial"),
  });
  return isUnit ? (
    <Outlet />
  ) : (
    <>
      <Consumer brandSlug={brandSlug} gtin={gtin} />
      <Outlet />
    </>
  );
}
