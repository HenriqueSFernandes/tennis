// Auth API

const AUTH_URL =
  (import.meta.env.VITE_API_URL ?? "https://api.riotinto.henriquesf.me") +
  "/api/auth";

export async function verifyPassword(password: string): Promise<boolean> {
  const resp = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return resp.ok;
}
