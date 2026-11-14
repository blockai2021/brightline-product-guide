import { QueryClient } from "@tanstack/react-query";
import { createRouter, isRedirect, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { Route as legacyContentRoute } from "@/routes/admin.content";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
  it("redirects the legacy content URL to the products content tab", () => {
    const beforeLoad = legacyContentRoute.options.beforeLoad;
    if (!beforeLoad) throw new Error("Legacy content redirect is missing");
    try {
      Reflect.apply(beforeLoad, undefined, []);
      throw new Error("Expected a redirect");
    } catch (result) {
      if (!isRedirect(result)) throw result;
      expect(result.options.to).toBe("/admin/products");
      expect(result.options.search).toEqual({ tab: "content" });
    }
  });
});
