// Local blog model used for process-oriented development logs.
type LocalBlogPost = {
  id: number;
  slug: string;
  title: string;
  publishedAt: string;
  summary: string;
  preface: string;
  process: string[];
  outcomes: string[];
  links?: Array<{ label: string; href: string }>;
};

// Local blog entries replacing remote markdown rendering.
const LOCAL_BLOG_POSTS: LocalBlogPost[] = [
  {
    id: 1,
    slug: "terminal-output-evolution",
    title: "Terminal Output Evolution",
    publishedAt: "2026-04-12",
    summary:
      "How output rendering evolved from plain text to structured command views.",
    preface: [
      "# Terminal Output Evolution",
      "This log captures how the command output layer was made more readable and mobile-safe.",
      "",
      "Context:",
      "- Command blocks were functionally correct but visually dense",
      "- Markdown rendering lacked strong hierarchy",
      "- Mobile readability dropped sharply with long outputs",
    ].join("\n"),
    process: [
      "Audit every command output mode and identify where text/html switched",
      "Add command-specific output structures (whoami, neofetch)",
      "Introduce responsive behavior for mixed-width content",
      "Move toward local content ownership for predictable output visuals",
    ],
    outcomes: [
      "Reduced dependency on external markdown rendering",
      "Better consistency between desktop and mobile output layouts",
      "Faster iteration on copy and visual hierarchy",
    ],
    links: [
      { label: "Project Context", href: "https://github.com/ri5hii/rishi.sh" },
    ],
  },
];

const indexCache = new Map<string, string>();
const postCache = new Map<string, string>();

// Escapes text before embedding in HTML snippets.
const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// Formats date in concise month-day-year style.
const formatDate = (isoDate: string) => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
};

// Resolves a local post by numeric id or slug.
const resolvePost = (identifier: string) => {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized) return null;

  const numericId = Number(normalized);
  if (Number.isInteger(numericId)) {
    const byId = LOCAL_BLOG_POSTS.find((post) => post.id === numericId);
    if (byId) return byId;
  }

  return (
    LOCAL_BLOG_POSTS.find((post) => post.slug.toLowerCase() === normalized) ??
    null
  );
};

// Renders list item rows for reusable card sections.
const renderItems = (values: string[]) =>
  values.map((value) => `<li>${escapeHtml(value)}</li>`).join("\n");

// Renders optional links for a blog post card.
const renderLinks = (links?: Array<{ label: string; href: string }>) => {
  if (!links?.length) return "<li>No external links.</li>";

  return links
    .map(
      (link) =>
        `<li><a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a></li>`,
    )
    .join("\n");
};

// Builds the default blog index output.
export const fetchBlogIndexHtml = async (): Promise<string> => {
  const cacheKey = "index";
  const cached = indexCache.get(cacheKey);
  if (cached) return cached;

  const items = LOCAL_BLOG_POSTS.map(
    (post) =>
      `<li><strong>[${post.id}] ${escapeHtml(post.title)}</strong> — ${escapeHtml(post.summary)}<br /><span>${formatDate(post.publishedAt)} • slug: <code>${escapeHtml(post.slug)}</code></span></li>`,
  ).join("\n");

  const html = [
    "<h2>Blog Logs</h2>",
    "<p>Open a log with <code>blog &lt;id|slug&gt;</code>.</p>",
    `<ul>${items || "<li>No blog logs available yet.</li>"}</ul>`,
  ].join("\n");

  indexCache.set(cacheKey, html);
  return html;
};

// Builds a local blog detail page focused on development process and outcomes.
export const fetchBlogPostHtml = async (
  identifier: string,
): Promise<string> => {
  const post = resolvePost(identifier);
  if (!post) {
    throw new Error(
      `Post not found: ${identifier}. Try \"blog\" to view available posts.`,
    );
  }

  const cacheKey = post.slug.toLowerCase();
  const cached = postCache.get(cacheKey);
  if (cached) return cached;

  const html = [
    '<div class="ContentSheet ContentSheet--blog">',
    `  <pre class="ContentPre">${escapeHtml(post.preface)}</pre>`,
    '  <div class="MarkdownCards">',
    '    <div class="MarkdownCard">',
    '      <h3 class="MarkdownCardTitle">Process</h3>',
    `      <ul>${renderItems(post.process)}</ul>`,
    "    </div>",
    '    <div class="MarkdownCard">',
    '      <h3 class="MarkdownCardTitle">Outcomes</h3>',
    `      <ul>${renderItems(post.outcomes)}</ul>`,
    "    </div>",
    '    <div class="MarkdownCard">',
    '      <h3 class="MarkdownCardTitle">Links</h3>',
    `      <ul>${renderLinks(post.links)}</ul>`,
    "    </div>",
    "  </div>",
    `  <p>${formatDate(post.publishedAt)} • id: ${post.id} • slug: <code>${escapeHtml(post.slug)}</code></p>`,
    "</div>",
  ].join("\n");

  postCache.set(cacheKey, html);
  return html;
};
