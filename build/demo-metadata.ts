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
): Record<string, string> {
  const buildTime = command === "build" ? input.VITE_BUILD_TIME || buildStartedAt : "";
  return {
    "import.meta.env.VITE_APP_GIT_SHA": JSON.stringify(input.VITE_APP_GIT_SHA || ""),
    "import.meta.env.VITE_BUILD_TIME": JSON.stringify(buildTime),
    "import.meta.env.VITE_DEPLOY_TIME": JSON.stringify(input.VITE_DEPLOY_TIME || ""),
  };
}
