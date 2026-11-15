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
  if (/^id-preview(?:-\d+)?--[a-z0-9-]+\.lovable\.app$/.test(hostname)) return "Preview";
  if (hostname === "product-icode-platform.lovable.app") return "Stable Demo";
  return "Unknown";
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
  return [
    "Product iCode Connect",
    `${t("Build.version")}: ${info.version}${info.versionApproved ? "" : ` (${t("Build.provisional")})`}`,
    `${t("Build.environment")}: ${t(`Build.${environment}`)}`,
    `Git Commit SHA: ${info.gitSha}`,
    `${t("Build.builtAt")}: ${info.builtAt}`,
    `Build ID: ${info.buildId}`,
    `${t("Build.deployedAt")}: ${info.deployedAt}`,
    `${t("Build.site")}: ${url}`,
    "Browser-local Demo",
    t("Build.limitations"),
  ].join("\n");
}
