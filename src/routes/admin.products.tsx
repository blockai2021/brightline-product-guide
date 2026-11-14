import { createFileRoute } from "@tanstack/react-router";
import { Products } from "@/features/connect/admin";
import { pageMeta } from "@/features/connect/meta";
export const Route = createFileRoute("/admin/products")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: "basic" | "content" | "units" | "links" | "publishing" } => ({
    tab:
      search["tab"] === "content" ||
      search["tab"] === "units" ||
      search["tab"] === "links" ||
      search["tab"] === "publishing"
        ? search["tab"]
        : "basic",
  }),
  component: ProductsPage,
  head: () =>
    pageMeta("Product management", "Create drafts and publish connected product information."),
});
function ProductsPage() {
  const { tab = "basic" } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <Products
      tab={tab}
      onTabChange={(tab) => navigate({ to: "/admin/products", search: { tab }, replace: true })}
    />
  );
}
