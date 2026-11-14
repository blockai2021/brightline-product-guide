import { createFileRoute } from "@tanstack/react-router";
import { PrintingLabels } from "@/features/connect/printing-labels";
import { pageMeta } from "@/features/connect/meta";
export const Route = createFileRoute("/admin/printing")({
  validateSearch: (search: Record<string, unknown>): { productId?: string } =>
    typeof search["productId"] === "string" ? { productId: search["productId"] } : {},
  head: () =>
    pageMeta(
      "Printing & Labels",
      "Browser-local print jobs, frozen CSV label data and manually recorded printing confirmations.",
    ),
  component: PrintingPage,
});
function PrintingPage() {
  const { productId } = Route.useSearch();
  return (
    <PrintingLabels
      key={productId ?? "all"}
      {...(productId ? { initialProductId: productId } : {})}
    />
  );
}
