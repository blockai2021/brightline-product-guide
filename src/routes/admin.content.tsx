import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageMeta } from "@/features/connect/meta";
export const Route = createFileRoute("/admin/content")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/products", search: { tab: "content" }, replace: true });
  },
  head: () => pageMeta("Multilingual content", "Manage product guides, FAQs and video resources."),
});
