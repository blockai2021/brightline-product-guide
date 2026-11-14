import { createFileRoute } from "@tanstack/react-router";
import { AfterSales } from "@/features/connect/admin";
import { pageMeta } from "@/features/connect/meta";
export const Route = createFileRoute("/admin/after-sales")({
  component: AfterSales,
  head: () => pageMeta("After-sales", "Manage demo warranty registrations and support requests."),
});
