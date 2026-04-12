const ABOUT_SHEET_PATH = "/about/about.html";

// In-memory cache for locally rendered about output.
let aboutHtmlCache: string | null = null;

// Resolves a public asset path for browser runtime and local Bun file runtime.
const resolvePublicFetchUrl = (publicPath: string) => {
  const normalized = publicPath.startsWith("/") ? publicPath : `/${publicPath}`;

  if (typeof window !== "undefined") {
    return normalized;
  }

  const withoutLeadingSlash = normalized.replace(/^\/+/, "");
  return new URL(
    `../../public/${withoutLeadingSlash}`,
    import.meta.url,
  ).toString();
};

// Loads and caches about output from a local public HTML sheet.
export const fetchAboutRenderedHtml = async (): Promise<string> => {
  if (aboutHtmlCache) return aboutHtmlCache;

  const response = await fetch(resolvePublicFetchUrl(ABOUT_SHEET_PATH), {
    headers: {
      Accept: "text/html, text/plain",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to load about sheet (${response.status}).`);
  }

  const html = await response.text();
  if (!html.trim()) {
    throw new Error("About sheet is empty.");
  }

  aboutHtmlCache = html;
  return html;
};
