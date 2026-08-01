/**
 * Bilingual tokens for in-app notification bodies.
 * Stored as [[en|||ar]] and resolved at display time by UI language.
 */

const TOKEN_RE = /\[\[([\s\S]*?)\|\|\|([\s\S]*?)\]\]/g;

/** Encode an EN/AR pair for later language-aware display. */
export function bilingualNotifyToken(
  en?: string | null,
  ar?: string | null,
): string {
  const e = (en ?? "").trim();
  const a = (ar ?? "").trim();
  if (e && a) return `[[${e}|||${a}]]`;
  return e || a || "";
}

/** Resolve all [[en|||ar]] tokens for the active UI language. */
export function resolveNotificationBilingual(
  text: string,
  language: string,
): string {
  if (!text || !text.includes("[[")) return text;
  const preferAr = language === "ar" || language.startsWith("ar");
  return text.replace(TOKEN_RE, (_m, en: string, ar: string) => {
    const e = en.trim();
    const a = ar.trim();
    return preferAr ? a || e : e || a;
  });
}

export function formatNotifyPropertyRef(
  code?: string | null,
  title?: string | null,
  titleAr?: string | null,
): string {
  const codePart = (code ?? "").trim();
  const titlePart = bilingualNotifyToken(title, titleAr);
  if (codePart && titlePart) return `${codePart} — ${titlePart}`;
  return codePart || titlePart || "—";
}

export function formatNotifyPropertyLine(
  code?: string | null,
  title?: string | null,
  titleAr?: string | null,
): string {
  return `Property: ${formatNotifyPropertyRef(code, title, titleAr)}`;
}

export function formatNotifyTitleLine(
  title?: string | null,
  titleAr?: string | null,
): string {
  return `Title: ${bilingualNotifyToken(title, titleAr) || "—"}`;
}

export function formatNotifyAgentLine(
  nameEn?: string | null,
  nameAr?: string | null,
  fallback?: string | null,
): string {
  const token =
    bilingualNotifyToken(nameEn, nameAr) || (fallback ?? "").trim();
  return token ? `Agent: ${token}` : "";
}

/** Escape a string for use inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Rewrite Property:/Title: lines using live bilingual property fields
 * so existing English-only notification bodies display correctly in AR.
 */
export function enrichNotificationBodyWithProperty(
  body: string | null,
  property: {
    code?: string | null;
    title?: string | null;
    title_ar?: string | null;
  } | null,
): string | null {
  if (!body || !property) return body;

  const code = (property.code ?? "").trim();
  const titleToken = bilingualNotifyToken(property.title, property.title_ar);
  if (!titleToken && !code) return body;

  let next = body;

  if (code) {
    const propertyWithTitle = new RegExp(
      `^Property:\\s*${escapeRegExp(code)}\\s*[—\\-]\\s*.+$`,
      "gm",
    );
    const propertyCodeOnly = new RegExp(
      `^Property:\\s*${escapeRegExp(code)}\\s*$`,
      "gm",
    );
    if (titleToken) {
      next = next.replace(
        propertyWithTitle,
        `Property: ${code} — ${titleToken}`,
      );
      next = next.replace(propertyCodeOnly, `Property: ${code} — ${titleToken}`);
    }
  } else if (titleToken) {
    next = next.replace(
      /^Property:\s*.+$/gm,
      `Property: ${titleToken}`,
    );
  }

  if (titleToken) {
    next = next.replace(/^Title:\s*.+$/gm, `Title: ${titleToken}`);
  }

  return next;
}

/**
 * Replace plain "Agent: Name" lines with bilingual tokens when we can match
 * the English (or Arabic) display name against company actors.
 */
export function enrichNotificationBodyWithActors(
  body: string | null,
  actorsByName: Map<string, string>,
): string | null {
  if (!body || actorsByName.size === 0) return body;

  return body.replace(/^Agent:\s*(.+)$/gm, (full, rawName: string) => {
    const name = rawName.trim();
    if (!name || name.includes("[[")) return full;
    const token =
      actorsByName.get(name.toLowerCase()) ||
      actorsByName.get(name.replace(/\s+/g, " ").toLowerCase());
    return token ? `Agent: ${token}` : full;
  });
}

/** Normalize a person name for lookup maps. */
export function normalizeActorLookupKey(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
