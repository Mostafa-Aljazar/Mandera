'use client';

import Pocketbase from 'pocketbase';

const POCKETBASE_API_URL = '/hcgi/platform';
const AUTH_COOKIE_KEY = 'pb_auth';

let client: Pocketbase | null = null;

// Lazily construct a single PocketBase client for the browser, backed by a
// cookie (not localStorage) so the same auth state is readable server-side
// by middleware.ts. Constructing lazily (not at module scope) keeps this
// file safe to import from code that might run during SSR — the instance
// is only ever created once a component actually calls getPocketbaseClient()
// on the client.
function getPocketbaseClient(): Pocketbase {
  if (client) return client;

  client = new Pocketbase(POCKETBASE_API_URL);

  if (typeof document !== 'undefined') {
    client.authStore.loadFromCookie(document.cookie, AUTH_COOKIE_KEY);

    client.authStore.onChange(() => {
      document.cookie = client.authStore.exportToCookie(
        { httpOnly: false, path: '/', maxAge: 60 * 60 * 24 * 30 },
        AUTH_COOKIE_KEY
      );
    });
  }

  return client;
}

const pocketbaseClient = getPocketbaseClient();

export default pocketbaseClient;
export { pocketbaseClient, AUTH_COOKIE_KEY };
