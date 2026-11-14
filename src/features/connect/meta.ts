export function pageMeta(title: string, description: string) {
  return {
    meta: [
      { title: `${title} | Product iCode Connect` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} | Product iCode Connect` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}
