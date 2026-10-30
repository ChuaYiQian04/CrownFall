export const usesHashRouting = () =>
  import.meta.env.VITE_ROUTER_MODE === "hash";

export function invitationUrl(code: string, origin = location.origin) {
  const base = import.meta.env.BASE_URL;
  return new URL(
    `${base}${usesHashRouting() ? "#/" : ""}join/${encodeURIComponent(code)}`,
    origin,
  ).href;
}

// Accept both normal and GitHub Pages invitation links, including project paths.
export function invitationCode(text: string): string | null {
  try {
    const url = new URL(text);
    if (!["https:", "http:"].includes(url.protocol)) return null;
    const path = url.hash.startsWith("#/")
      ? url.hash.slice(1).split("?")[0]
      : url.pathname;
    return (
      path.match(/\/(?:join)\/([A-Z2-9]{6})\/?$/i)?.[1]?.toUpperCase() || null
    );
  } catch {
    return null;
  }
}
