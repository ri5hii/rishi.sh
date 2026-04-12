// Blog post metadata contract loaded from public blog index.
type BlogPost = {
  id: number;
  slug: string;
  title: string;
  publishedAt: string;
  summary: string;
  file: string;
};

// Repo context used by GitHub markdown renderer for relative links.
const BLOG_CONTEXT_REPO = "rishi.sh";

// Session caches for index pages, individual post html, and markdown content.
const indexCache = new Map<string, string>();
const postHtmlCache = new Map<string, string>();
const postMarkdownCache = new Map<string, string>();

let blogPostsCache: BlogPost[] | null = null;

// Escapes raw text so fallback markdown rendering remains safe.
const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// Renders markdown to HTML with GitHub API and falls back to preformatted text.
const renderMarkdownToHtml = async (markdown: string): Promise<string> => {
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
        context: `ri5hii/${BLOG_CONTEXT_REPO}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub markdown render failed (${response.status})`);
    }

    const html = await response.text();
    if (!html.trim()) {
      throw new Error("Rendered markdown was empty.");
    }

    return html;
  } catch {
    return `<pre>${escapeHtml(markdown)}</pre>`;
  }
};

// Normalizes and validates loose json payloads into BlogPost records.
const normalizeBlogPost = (item: Partial<BlogPost>): BlogPost | null => {
  if (
    typeof item.id !== "number" ||
    !Number.isInteger(item.id) ||
    item.id <= 0 ||
    typeof item.slug !== "string" ||
    !item.slug.trim() ||
    typeof item.title !== "string" ||
    !item.title.trim() ||
    typeof item.publishedAt !== "string" ||
    !item.publishedAt.trim() ||
    typeof item.summary !== "string" ||
    typeof item.file !== "string" ||
    !item.file.trim()
  ) {
    return null;
  }

  return {
    id: item.id,
    slug: item.slug.trim(),
    title: item.title.trim(),
    publishedAt: item.publishedAt.trim(),
    summary: item.summary.trim(),
    file: item.file.trim(),
  };
};

// Loads, validates, and sorts all posts from the static blog index.
const fetchBlogPosts = async (): Promise<BlogPost[]> => {
  if (blogPostsCache) return blogPostsCache;

  const response = await fetch("/blog/index.json", {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to load blog index (${response.status}).`);
  }

  const responseBody = await response.text();
  const trimmedBody = responseBody.trim();
  if (!trimmedBody) {
    blogPostsCache = [];
    return blogPostsCache;
  }

  let raw: unknown;
  try {
    raw = JSON.parse(trimmedBody) as unknown;
  } catch {
    throw new Error("Invalid JSON in /blog/index.json.");
  }

  if (!Array.isArray(raw)) {
    throw new Error("Invalid blog index format in /blog/index.json.");
  }

  const parsed = raw
    .map((item) => normalizeBlogPost(item as Partial<BlogPost>))
    .filter((item): item is BlogPost => item !== null)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  blogPostsCache = parsed;
  return parsed;
};

// Fetches markdown source for a specific post and memoizes the result.
const fetchBlogMarkdown = async (post: BlogPost): Promise<string> => {
  const cacheKey = post.slug.toLowerCase();
  const cached = postMarkdownCache.get(cacheKey);
  if (cached) return cached;

  const safeFile = post.file.replace(/^\/+/, "");
  const response = await fetch(`/blog/${safeFile}`, {
    headers: {
      Accept: "text/markdown, text/plain",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to load blog markdown for ${post.slug}.`);
  }

  const markdown = await response.text();
  if (!markdown.trim()) {
    throw new Error(`Blog post is empty: ${post.slug}`);
  }

  postMarkdownCache.set(cacheKey, markdown);
  return markdown;
};

// Formats ISO date strings for terminal display.
const formatDate = (isoDate: string) => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
};

// Resolves either numeric id or slug to a known blog post.
const resolvePost = (identifier: string) => {
  const trimmed = identifier.trim().toLowerCase();
  if (!trimmed) return null;

  return fetchBlogPosts().then((posts) => {
    const numericId = Number(trimmed);
    if (Number.isInteger(numericId)) {
      const byId = posts.find((post) => post.id === numericId);
      if (byId) return byId;
    }

    return posts.find((post) => post.slug.toLowerCase() === trimmed) ?? null;
  });
};

// Builds the blog listing page shown for the base blog command.
export const fetchBlogIndexHtml = async (): Promise<string> => {
  const cacheKey = "index";
  const cached = indexCache.get(cacheKey);
  if (cached) return cached;

  const posts = await fetchBlogPosts();

  const items = posts
    .map(
      (post) =>
        `<li><strong>[${post.id}] ${escapeHtml(post.title)}</strong> — ${escapeHtml(post.summary)}<br /><span>${formatDate(post.publishedAt)} • slug: <code>${escapeHtml(post.slug)}</code></span></li>`,
    )
    .join("\n");

  const html = [
    "<h2>Blog Posts</h2>",
    "<p>Open a post with <code>blog &lt;id|slug&gt;</code>.</p>",
    `<ul>${items || "<li>No posts available yet.</li>"}</ul>`,
  ].join("\n");

  indexCache.set(cacheKey, html);
  return html;
};

// Builds a rendered blog post page from markdown by id or slug.
export const fetchBlogPostHtml = async (
  identifier: string,
): Promise<string> => {
  const post = await resolvePost(identifier);
  if (!post) {
    throw new Error(
      `Post not found: ${identifier}. Try \"blog\" to view available posts.`,
    );
  }

  const cacheKey = String(post.id);
  const cached = postHtmlCache.get(cacheKey);
  if (cached) return cached;

  const markdown = await fetchBlogMarkdown(post);
  const bodyHtml = await renderMarkdownToHtml(markdown);
  const html = [
    `<h2>${escapeHtml(post.title)}</h2>`,
    `<p>${formatDate(post.publishedAt)} • id: ${post.id} • slug: <code>${escapeHtml(post.slug)}</code></p>`,
    "<hr />",
    bodyHtml,
  ].join("\n");

  postHtmlCache.set(cacheKey, html);
  return html;
};
