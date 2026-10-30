import { afterEach, expect, it, vi } from "vitest";
import { invitationCode, invitationUrl } from "./invitations";
afterEach(() => vi.unstubAllEnvs());
it("builds root browser invitations for local and Cloudflare hosting", () => {
  vi.stubEnv("BASE_URL", "/");
  vi.stubEnv("VITE_ROUTER_MODE", "");
  expect(invitationUrl("ABCDEF", "https://crownfall.example")).toBe(
    "https://crownfall.example/join/ABCDEF",
  );
});
it("builds hash invitations under the GitHub project path", () => {
  vi.stubEnv("BASE_URL", "/CrownFall/");
  vi.stubEnv("VITE_ROUTER_MODE", "hash");
  const link = invitationUrl("ABCDEF", "https://chuayiqian04.github.io");
  expect(link).toBe("https://chuayiqian04.github.io/CrownFall/#/join/ABCDEF");
  expect(invitationCode(link)).toBe("ABCDEF");
});
it.each([
  "https://example.com/join/abcde2",
  "https://example.com/CrownFall/join/ABCDE2",
  "https://example.com/CrownFall/#/join/ABCDE2",
  "https://example.com/#/join/ABCDE2",
])("reads supported QR invitation %s", (text) => {
  expect(invitationCode(text)).toBe("ABCDE2");
});
it.each([
  "not a url",
  "https://example.com/join/ABC",
  "https://example.com/join/ABCDEF/other",
  "javascript:alert(1)",
  "https://example.com/#/settings",
])("rejects unrelated QR value %s", (text) =>
  expect(invitationCode(text)).toBeNull(),
);
