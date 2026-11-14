import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout } from "@/features/connect/admin";
export const Route = createFileRoute("/admin")({ component: AdminLayout });
