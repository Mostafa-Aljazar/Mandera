// Browser-side half of the direct-to-storage upload. Deliberately plain
// `fetch`: a signed upload URL carries its own authorisation in the query
// string, so no Supabase client — and therefore no Supabase key — is needed in
// the browser, which keeps the "only src/actions talks to Supabase" rule
// intact.
//
// The request shape mirrors what supabase-js's uploadToSignedUrl sends: a
// multipart body whose file field name is the empty string, plus cacheControl.
// Verified against the live bucket before this was written.

const UPLOAD_CACHE_CONTROL = "3600";

/** How many files travel at once — enough to be quick, few enough that a phone
 *  on mobile data does not stall every request at the same time. */
const UPLOAD_CONCURRENCY = 3;

export interface SignedUploadTarget {
  signedUrl: string;
  publicUrl: string;
  path: string;
}

export async function uploadToSignedUrl(
  target: SignedUploadTarget,
  file: File,
): Promise<string> {
  const body = new FormData();
  body.append("cacheControl", UPLOAD_CACHE_CONTROL);
  body.append("", file);

  const res = await fetch(target.signedUrl, {
    method: "PUT",
    body,
    headers: { "x-upsert": "false" },
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Upload failed for "${file.name}" (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }

  return target.publicUrl;
}

/**
 * Upload every file to its matching target, preserving input order in the
 * returned URLs — the order is what the listing's image order comes from, so
 * it must not follow completion order.
 */
export async function uploadAllToSignedUrls(
  targets: SignedUploadTarget[],
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<string[]> {
  if (files.length !== targets.length) {
    throw new Error("Upload targets do not match the selected files.");
  }

  const urls = new Array<string>(files.length);
  let done = 0;
  let next = 0;

  const worker = async () => {
    while (next < files.length) {
      const index = next++;
      urls[index] = await uploadToSignedUrl(targets[index], files[index]);
      done += 1;
      onProgress?.(done, files.length);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(UPLOAD_CONCURRENCY, files.length) }, worker),
  );

  return urls;
}
