import { afterEach, expect, it, vi } from "vitest";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});
it("uses demo only when both configuration values are absent", async () => {
  vi.stubEnv("VITE_SUPABASE_URL", "");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
  vi.resetModules();
  const service = await import("./rooms");
  expect(service.isDemo).toBe(true);
  expect(service.configurationError).toBe("");
});
it("blocks partial cloud configuration rather than creating a demo room", async () => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
  vi.resetModules();
  const service = await import("./rooms");
  expect(service.isDemo).toBe(false);
  await expect(service.createRoom("Arden")).rejects.toThrow("incomplete");
});
it("shows invalid URL configuration without crashing the app module", async () => {
  vi.stubEnv("VITE_SUPABASE_URL", "invalid-url");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "public-key");
  vi.resetModules();
  const service = await import("./rooms");
  expect(service.isDemo).toBe(false);
  await expect(service.getRoom("ABCDEF")).rejects.toThrow("invalid");
});
