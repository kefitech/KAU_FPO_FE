function getLocale(): string {
  try {
    const stored = localStorage.getItem("locale-storage");
    return stored ? (JSON.parse(stored)?.state?.locale ?? "en") : "en";
  } catch {
    return "en";
  }
}

export function publicFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const locale = getLocale();
  return fetch(input, {
    ...init,
    headers: {
      "X-Language": locale,
      ...(init?.headers ?? {}),
    },
  });
}
