import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Provide default env vars so modules importing `lib/env` don't crash on load.
// Tests that exercise env validation override these via `process.env = ...` + `vi.resetModules()`.
process.env.GOOGLE_GENERATIVE_API_KEY ||= "test-gen-key";
process.env.GOOGLE_MAPS_API_KEY ||= "test-maps-key";
process.env.FLIGHTS_API_KEY ||= "test-flights-key";

afterEach(() => {
  cleanup();
});
