import Pocketbase from 'pocketbase';

const POCKETBASE_API_URL = '/hcgi/platform';
const AUTH_COOKIE_KEY = 'pb_auth';

// Server-only helper: builds a fresh PocketBase instance per request and
// hydrates its authStore from the incoming cookie header — never touches
// localStorage/document, safe to call from middleware.js and Server Components.
export function getServerPocketbase(cookieHeader) {
  const pb = new Pocketbase(POCKETBASE_API_URL);
  if (cookieHeader) {
    pb.authStore.loadFromCookie(cookieHeader, AUTH_COOKIE_KEY);
  }
  return pb;
}

export { AUTH_COOKIE_KEY };
