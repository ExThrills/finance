export async function fetchJson<T>(
  input: RequestInfo,
  init?: RequestInit
): Promise<T> {
  let authHeader: Record<string, string> = {};

  if (typeof window !== "undefined") {
    try {
      const { supabaseBrowser } = await import("@/lib/supabase-browser");
      const { data } = await supabaseBrowser.auth.getSession();
      const token = data.session?.access_token;
      if (token) {
        authHeader = { Authorization: `Bearer ${token}` };
      }
    } catch (error) {
      console.warn("Unable to read auth session for API request.", error);
    }
  }

  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message =
      errorBody?.error && typeof errorBody.error === "string"
        ? errorBody.error
        : "Request failed.";
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
