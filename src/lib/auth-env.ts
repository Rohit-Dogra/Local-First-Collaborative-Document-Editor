/** Fix common AUTH_URL typos (e.g. https:/site.com → https://site.com). */
export function normalizeAuthUrl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;

  let url = raw.trim().replace(/^["']|["']$/g, "");

  // https:/example.com or http:/example.com → add missing slash
  url = url.replace(/^(https?):\/(?!\/)/i, "$1://");

  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  return url.replace(/\/$/, "");
}

export function applyAuthUrlEnv(): void {
  const normalized = normalizeAuthUrl(process.env.AUTH_URL ?? process.env.NEXTAUTH_URL);
  if (!normalized) return;

  process.env.AUTH_URL = normalized;
  process.env.NEXTAUTH_URL = normalized;
}
