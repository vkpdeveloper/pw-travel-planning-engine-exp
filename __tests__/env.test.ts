import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const VALID_ENV = {
  GOOGLE_GENERATIVE_API_KEY: "test-gen-key",
  GOOGLE_MAPS_API_KEY: "test-maps-key",
  GOOGLE_MAPS_MAP_ID: "test-map-id",
  FLIGHTS_API_KEY: "test-flights-key",
  NODE_ENV: "test",
};

describe("lib/env", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("parses valid env vars", async () => {
    Object.assign(process.env, VALID_ENV);
    const { env } = await import("@/lib/env");
    expect(env.GOOGLE_GENERATIVE_API_KEY).toBe("test-gen-key");
    expect(env.GOOGLE_MAPS_API_KEY).toBe("test-maps-key");
    expect(env.GOOGLE_MAPS_MAP_ID).toBe("test-map-id");
    expect(env.FLIGHTS_API_KEY).toBe("test-flights-key");
    expect(env.NODE_ENV).toBe("test");
  });

  it("defaults NODE_ENV to development when unset", async () => {
    Object.assign(process.env, VALID_ENV);
    delete (process.env as Record<string, string | undefined>).NODE_ENV;
    const { env } = await import("@/lib/env");
    expect(env.NODE_ENV).toBe("development");
  });

  it("throws when required vars are missing", async () => {
    process.env = { NODE_ENV: "test" } as NodeJS.ProcessEnv;
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(import("@/lib/env")).rejects.toThrow(/Invalid environment variables/);
    expect(errSpy).toHaveBeenCalled();
  });
});
