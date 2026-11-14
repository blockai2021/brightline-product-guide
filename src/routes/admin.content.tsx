import { createFileRoute } from "@tanstack/react-router";
import { Products } from "@/features/connect/admin";
import { pageMeta } from "@/features/connect/meta";
export const Route = createFileRoute("/admin/content")({
  component: ContentPage,
  head: () => pageMeta("Multilingual content", "Manage product guides, FAQs and video resources."),
});
function ContentPage() {
  return <Products contentOnly />;
}
