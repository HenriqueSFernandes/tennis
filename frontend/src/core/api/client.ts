// Base API client and error handling

const API_BASE =
  (import.meta.env.VITE_API_URL ?? "https://api.riotinto.henriquesf.me") +
  "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(
  path: string,
  password: string,
  options: RequestInit = {},
): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-App-Password": password,
      ...options.headers,
    },
  });

  if (!resp.ok) {
    let message = `HTTP ${resp.status}`;
    try {
      const body = (await resp.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore parse error
    }
    throw new ApiError(resp.status, message);
  }

  return resp.json() as Promise<T>;
}

export async function fetchBlob(path: string, password: string): Promise<Blob> {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: {
      "X-App-Password": password,
    },
  });

  if (!resp.ok) {
    let message = `HTTP ${resp.status}`;
    try {
      const body = (await resp.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore parse error
    }
    throw new ApiError(resp.status, message);
  }

  return resp.blob();
}
