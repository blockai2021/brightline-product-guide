import { randomUUID } from "node:crypto";

// Called by the Vite config hook, never by SSR or the browser. Cache the result
// for the whole Vite invocation so all bundle environments share one identity.
export function createBuildStamp() {
  return Object.freeze({ builtAt: new Date().toISOString(), buildId: randomUUID() });
}

export function createPreviewStamp() {
  return Object.freeze({ startedAt: new Date().toISOString(), sessionId: randomUUID() });
}

export type BuildMetadataInput = {
  VITE_APP_GIT_SHA?: string;
  VITE_BUILD_TIME?: string;
  VITE_DEPLOY_TIME?: string;
};

// Pure build helper: the caller supplies CI metadata and the build clock.
// Missing SHA/deploy time stays missing; neither git HEAD nor build time is a replacement.
export function demoMetadataDefines(
  input: BuildMetadataInput,
  command: "build" | "serve",
  buildStartedAt: string,
  buildId = "",
  preview?: ReturnType<typeof createPreviewStamp>,
): Record<string, string> {
  const buildTime =
    command === "build" ? (buildId ? buildStartedAt : input.VITE_BUILD_TIME || buildStartedAt) : "";
  return {
    "import.meta.env.VITE_APP_GIT_SHA": JSON.stringify(input.VITE_APP_GIT_SHA || ""),
    "import.meta.env.VITE_BUILD_TIME": JSON.stringify(buildTime),
    "import.meta.env.VITE_BUILD_ID": JSON.stringify(command === "build" ? buildId : ""),
    "import.meta.env.VITE_DEPLOY_TIME": JSON.stringify(input.VITE_DEPLOY_TIME || ""),
    "import.meta.env.VITE_PREVIEW_SESSION_ID": JSON.stringify(
      command === "serve" ? preview?.sessionId || "" : "",
    ),
    "import.meta.env.VITE_PREVIEW_STARTED_AT": JSON.stringify(
      command === "serve" ? preview?.startedAt || "" : "",
    ),
  };
}
