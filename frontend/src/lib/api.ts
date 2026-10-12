const rawApiUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");

// When running in the browser, always use relative URLs if VITE_API_URL points to localhost
// or is empty, ensuring requests go to the same origin through the secure proxy without mixed-content errors.
const isLocalhost =
  rawApiUrl.includes("localhost") ||
  rawApiUrl.includes("127.0.0.1") ||
  rawApiUrl.includes("0.0.0.0");

const apiBaseUrl =
  typeof window !== "undefined" && isLocalhost
    ? ""
    : rawApiUrl ||
      (import.meta.env.PROD ? "https://edutrack-q07f.onrender.com" : "");

export function apiUrl(path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl}${cleanPath}`;
}

export function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(apiUrl(path), init);
}
