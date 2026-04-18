import "dotenv/config";

export const ENCRYPTION_KEY = process.env["ENCRYPTION_KEY"] ?? "";
export const PORT = parseInt(process.env["PORT"] ?? "3000", 10);
export const DATA_DIR = process.env["DATA_DIR"] ?? "data";

export const SESSION_TTL_MS = 90 * 60 * 1000;

export const ALLOWED_ORIGINS = [
  "https://tennis.henriquesf.me",
  "https://api.tennis.henriquesf.me",
];

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.includes("localhost") || origin.startsWith("http://127.0.0.1"))
    return true;
  return false;
}
