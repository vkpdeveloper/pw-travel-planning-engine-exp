import { z } from "zod";

const envSchema = z.object({
  GOOGLE_GENERATIVE_API_KEY: z.string().min(1, "GOOGLE_GENERATIVE_API_KEY is required"),
  GOOGLE_MAPS_API_KEY: z.string().min(1, "GOOGLE_MAPS_API_KEY is required"),
  FLIGHT_API_KEY: z.string().min(1, "FLIGHT_API_KEY is required"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables. Check your .env file.");
}

export const env = parsed.data;
