import type { Locale } from "./domain";
import { translateAdmin } from "./translations";

export type DemoEnvironment = "Development" | "Preview" | "Stable Demo" | "Unknown";
export type BuildInfo = Readonly<{
  version: string;
  versionApproved: boolean;
  gitSha: string;
  builtAt: string;
  buildId: string;
  deployedAt: string;
}>;

function timestamp(value?: string): string {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    return "Unknown";
  return new Date(value).toISOString();
}

// Only explicitly supplied build metadata is accepted. Never query GitHub or
// inspect a repository HEAD to infer which commit the hosted site serves.
export function readBuildInfo(input: {
  version?: string;
  gitSha?: string;
  builtAt?: string;
  buildId?: string;
  deployedAt?: string;
}): BuildInfo {
  return Object.freeze({
    version: input.version?.trim() || "V0.1-demo",
    versionApproved: Boolean(input.version?.trim()),
    gitSha: /^[a-f0-9]{40}$/i.test(input.gitSha || "")
      ? String(input.gitSha).toLowerCase()
      : "Unknown",
    builtAt: timestamp(input.builtAt),
    buildId: /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      input.buildId || "",
    )
      ? String(input.buildId)
      : "Unknown",
    deployedAt: timestamp(input.deployedAt),
  });
}

export function environmentForHost(hostname: string): DemoEnvironment {
  hostname = hostname.toLowerCase().replace(/\.$/, "");
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1")
    return "Development";
  if (/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.lovableproject(?:-dev)?\.com$/.test(hostname))
    return "Preview";
  const hostingSuffix = /\.(?:lovable\.app|gpt-eng\.com|gptengineer\.run)$/;
  if (hostingSuffix.test(hostname)) {
    const labels = hostname.replace(hostingSuffix, "").split(".");
    const first = labels[0] || "";
    if (
      (labels.length <= 2 && /^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(first)) ||
      (labels.length === 1 && /^project--[a-z0-9-]+-dev$/.test(first)) ||
      (labels.length === 2 && /^live--[0-9a-f-]{36}(?:-thr_[a-z0-9]+)?$/.test(first))
    )
      return "Preview";
  }
  if (hostname === "product-icode-platform.lovable.app") return "Stable Demo";
  return "Unknown";
}

// Presentation only: retain validated metadata and distinguish a preview's
// missing fields from missing published deployment evidence.
export function metadataForDisplay(
  value: string,
  environment: DemoEnvironment,
  locale: Locale,
): string {
  return value === "Unknown" && environment === "Preview"
    ? translateAdmin(locale, "Build.previewUnavailable")
    : value;
}

export const buildInfo = readBuildInfo({
  version: import.meta.env["VITE_APP_VERSION"],
  gitSha: import.meta.env["VITE_APP_GIT_SHA"],
  builtAt: import.meta.env["VITE_BUILD_TIME"],
  buildId: import.meta.env["VITE_BUILD_ID"],
  deployedAt: import.meta.env["VITE_DEPLOY_TIME"],
});

export function versionReport(
  info: BuildInfo,
  environment: DemoEnvironment,
  locale: Locale,
  url: string,
) {
  const t = (key: string) => translateAdmin(locale, key);
  const display = (value: string) => metadataForDisplay(value, environment, locale);
  return [
    "Product iCode Connect",
    `${t("Build.version")}: ${info.version}${info.versionApproved ? "" : ` (${t("Build.provisional")})`}`,
    `${t("Build.environment")}: ${t(`Build.${environment}`)}`,
    `Git Commit SHA: ${display(info.gitSha)}`,
    `${t("Build.builtAt")}: ${display(info.builtAt)}`,
    `Build ID: ${display(info.buildId)}`,
    `${t("Build.deployedAt")}: ${display(info.deployedAt)}`,
    `${t("Build.site")}: ${url}`,
    "Browser-local Demo",
    t("Build.limitations"),
  ].join("\n");
}
