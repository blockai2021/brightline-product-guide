import { createFileRoute } from "@tanstack/react-router";
import { Products } from "@/features/connect/admin";
import { pageMeta } from "@/features/connect/meta";
export const Route = createFileRoute("/admin/products")({
  component: Products,
  head: () =>
    pageMeta("Product management", "Create drafts and publish connected product information."),
});
