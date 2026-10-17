import { supabase } from "./supabase";

const rawApiUrl = (import.meta.env.VITE_API_URL || "")
  .trim()
  .replace(/\/+$/, "");
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

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (data.session?.access_token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }
  return fetch(apiUrl(path), { ...init, headers });
}
