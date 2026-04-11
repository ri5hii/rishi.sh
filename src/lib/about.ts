const ABOUT_README_URLS = [
  "https://raw.githubusercontent.com/ri5hii/ri5hii/main/README.md",
  "https://raw.githubusercontent.com/ri5hii/ri5hii/master/README.md",
];

let aboutMarkdownCache: string | null = null;
let aboutHtmlCache: string | null = null;

export const fetchAboutReadme = async (): Promise<string> => {
  if (aboutMarkdownCache) return aboutMarkdownCache;

  for (const url of ABOUT_README_URLS) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;

      const markdown = await response.text();
      if (!markdown.trim()) continue;

      aboutMarkdownCache = markdown;
      return markdown;
    } catch {
      // Try next fallback URL.
    }
  }

  throw new Error("Unable to fetch profile README from GitHub right now.");
};

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const fetchAboutRenderedHtml = async (): Promise<string> => {
  if (aboutHtmlCache) return aboutHtmlCache;

  const markdown = await fetchAboutReadme();

  try {
    const response = await fetch("https://api.github.com/markdown", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({
        text: markdown,
        mode: "gfm",
        context: "ri5hii/ri5hii",
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub markdown render failed (${response.status})`);
    }

    const html = await response.text();
    if (!html.trim()) {
      throw new Error("GitHub markdown render returned empty HTML.");
    }

    aboutHtmlCache = html;
    return html;
  } catch {
    const fallbackHtml = `<pre>${escapeHtml(markdown)}</pre>`;
    aboutHtmlCache = fallbackHtml;
    return fallbackHtml;
  }
};
