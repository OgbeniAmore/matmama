/**
 * Canonical public URL for this app.
 *
 * Auth emails (signup confirmation, password reset) and invitation emails must
 * link back to the production deployment, not to whichever preview origin the
 * request happened to come from.
 */
export const APP_URL = "https://main.d34ou16e4j43yh.amplifyapp.com";

/** Origin to use for auth redirects: production URL for real users, current origin locally. */
export function authRedirectOrigin(): string {
  const host = window.location.hostname;
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovableproject.com");
  return isLocal ? window.location.origin : APP_URL;
}
