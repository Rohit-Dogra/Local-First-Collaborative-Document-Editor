/** Fix common AUTH_URL typos and accidental path prefixes. */
export function normalizeAuthUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;

  let url = raw.trim().replace(/^["']|["']$/g, "");

  // /Users/.../https://site.com → https://site.com
  url = url.replace(/^.*?(https?:\/\/)/i, "$1");

  // https:/example.com → https://example.com
  url = url.replace(/^(https?):\/(?!\/)/i, "$1://");

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname === "/" ? "" : parsed.pathname}`.replace(/\/$/, "");
  } catch {
    return undefined;
  }
}

function isLocalUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

export function applyAuthUrlEnv(): void {
  const normalized = normalizeAuthUrl(process.env.AUTH_URL ?? process.env.NEXTAUTH_URL);

  // Local dev: use localhost only — remote AUTH_URL breaks auth on npm run dev
  if (process.env.NODE_ENV === "development") {
    if (!normalized || !isLocalUrl(normalized)) {
      process.env.AUTH_URL = "http://localhost:3000";
      process.env.NEXTAUTH_URL = "http://localhost:3000";
      return;
    }
  }

  // Production with trustHost: skip AUTH_URL if unset or invalid
  if (!normalized) {
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
    return;
  }

  process.env.AUTH_URL = normalized;
  process.env.NEXTAUTH_URL = normalized;
}
