import type { CSSProperties } from "react";
import type { Campaign } from "./domain";

export const campaignThemes = [
  { id: "brand", color: "#1f4e79" },
  { id: "forest", color: "#2f6b4f" },
  { id: "sunset", color: "#c2562b" },
  { id: "ink", color: "#22252b" },
] as const;
export const campaignCategories = ["Workshop", "Launch", "Meetup", "Webinar"] as const;

const hexPattern = /^#[0-9a-f]{6}$/i;
export function safeThemeColor(value?: string) {
  return value && hexPattern.test(value) ? value : undefined;
}
export function safeImageUrl(value?: string) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}
/** Readable text colour for a hex background (WCAG relative luminance). */
export function contrastText(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#111111" : "#ffffff";
}
/** Inline style for a customised cover; undefined keeps the default theme style. */
export function campaignCoverStyle(c: Pick<Campaign, "themeColor" | "coverImage">) {
  const color = safeThemeColor(c.themeColor);
  const image = safeImageUrl(c.coverImage);
  if (!color && !image) return undefined;
  const style: CSSProperties = {};
  if (color) {
    style.background = color;
    style.color = contrastText(color);
  }
  if (image) {
    style.backgroundImage = `linear-gradient(rgba(0,0,0,.25), rgba(0,0,0,.45)), url("${image.replace(/"/g, "%22")}")`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
    style.color = "#ffffff";
  }
  return style;
}
