// GitHub username used for repository listing and metadata queries.
const GITHUB_USERNAME = "ri5hii";

// Add repository names here to hide them from `projects` listing/details.
const EXCLUDED_REPO_NAMES: string[] = ["zinnia"];
const EXCLUDED_REPO_SET = new Set(
  EXCLUDED_REPO_NAMES.map((name) => name.trim().toLowerCase()).filter(Boolean),
);

// Checks whether a repository should be hidden from user-facing project commands.
const isRepoExcluded = (repoName: string) =>
  EXCLUDED_REPO_SET.has(repoName.trim().toLowerCase());

// Summary shape returned by the GitHub repositories listing endpoint.
type RepoSummary = {
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  fork: boolean;
  archived: boolean;
  updated_at: string;
};

// Detail shape returned by the GitHub single repository endpoint.
type RepoDetail = {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  topics?: string[];
};

// Session caches for project index and rendered project readmes.
const projectIndexCache = new Map<string, string>();
const projectReadmeCache = new Map<string, string>();

// Escapes raw text to safely embed repository content in HTML.
const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// Normalizes badge labels for shields.io URLs.
const toBadgeLabel = (value: string) =>
  encodeURIComponent(value.replaceAll("_", " ").replaceAll("-", " "));

// Creates a shields.io badge image for project metadata rows.
const buildBadgeImg = (label: string, message: string, color: string) => {
  const src = `https://img.shields.io/badge/${toBadgeLabel(label)}-${toBadgeLabel(message)}-${color}?style=flat-square`;
  return `<img src="${src}" alt="${escapeHtml(label)} ${escapeHtml(message)} badge" />`;
};

// Fetches full repository metadata used for README detail headers.
const fetchRepoDetail = async (repoName: string): Promise<RepoDetail> => {
  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_USERNAME}/${encodeURIComponent(repoName)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
      },
    },
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Repository not found: ${repoName}`);
    }
    throw new Error(`Unable to load repository metadata (${response.status}).`);
  }

  return (await response.json()) as RepoDetail;
};

// Builds the metadata header block shown above rendered project README content.
const buildProjectHeaderHtml = (repo: RepoDetail) => {
  const badges: string[] = [];

  if (repo.language) {
    badges.push(buildBadgeImg("Language", repo.language, "1f6feb"));
  }

  badges.push(buildBadgeImg("Stars", String(repo.stargazers_count), "f59e0b"));
  badges.push(buildBadgeImg("Forks", String(repo.forks_count), "0ea5e9"));
  badges.push(
    buildBadgeImg("Issues", String(repo.open_issues_count), "ef4444"),
  );

  const topics = (repo.topics ?? []).slice(0, 8);
  for (const topic of topics) {
    badges.push(buildBadgeImg("Tech", topic, "22c55e"));
  }

  const description = repo.description
    ? `<p>${escapeHtml(repo.description)}</p>`
    : "";

  return [
    `<h2>${escapeHtml(repo.name)}</h2>`,
    description,
    `<p><a href="${repo.html_url}">Open repository in GitHub</a></p>`,
    `<div class="ProjectBadgeRow">${badges.join("\n")}</div>`,
    `<hr />`,
  ]
    .filter(Boolean)
    .join("\n");
};

// Renders README markdown via GitHub API and falls back to plain preformatted content.
const renderMarkdownToHtml = async (markdown: string, contextRepo: string) => {
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
        context: `${GITHUB_USERNAME}/${contextRepo}`,
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

// Fetches all repositories for the configured user in updated order.
const fetchRepos = async (): Promise<RepoSummary[]> => {
  const response = await fetch(
    `https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100&sort=updated`,
    {
      headers: {
        Accept: "application/vnd.github+json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Unable to load repositories (${response.status}).`);
  }

  return (await response.json()) as RepoSummary[];
};

// Builds the html list used by the base projects command.
export const fetchProjectsIndexHtml = async (
  includeAll = false,
): Promise<string> => {
  const exclusionKey = Array.from(EXCLUDED_REPO_SET).sort().join(",");
  const cacheKey = `${includeAll ? "all" : "default"}:${exclusionKey}`;
  const cached = projectIndexCache.get(cacheKey);
  if (cached) return cached;

  const repos = await fetchRepos();
  const filtered = (
    includeAll ? repos : repos.filter((repo) => !repo.archived)
  ).filter((repo) => !isRepoExcluded(repo.name));

  const items = filtered
    .slice(0, 12)
    .map((repo) => {
      const description = repo.description
        ? escapeHtml(repo.description)
        : "No description provided.";
      return `<li><a href="${repo.html_url}">${repo.name}</a> — ${description} (★ ${repo.stargazers_count})</li>`;
    })
    .join("");

  const html = [
    `<h2>Projects — ${GITHUB_USERNAME}</h2>`,
    `<p>Use <code>projects &lt;repo&gt;</code> to open a project README inside the terminal.</p>`,
    `<ul>${items || "<li>No repositories found.</li>"}</ul>`,
  ].join("\n");

  projectIndexCache.set(cacheKey, html);
  return html;
};

// Builds a rendered README view for a single repository.
export const fetchProjectReadmeHtml = async (
  repoName: string,
): Promise<string> => {
  const normalized = repoName.trim();
  if (!normalized) {
    throw new Error(
      "Please provide a repository name. Example: projects rishi.sh",
    );
  }

  if (isRepoExcluded(normalized)) {
    throw new Error(`Repository is excluded by local config: ${normalized}`);
  }

  const cacheKey = normalized.toLowerCase();
  const cached = projectReadmeCache.get(cacheKey);
  if (cached) return cached;

  const readmeResponse = await fetch(
    `https://api.github.com/repos/${GITHUB_USERNAME}/${encodeURIComponent(normalized)}/readme`,
    {
      headers: {
        Accept: "application/vnd.github.raw+json",
      },
    },
  );

  if (!readmeResponse.ok) {
    if (readmeResponse.status === 404) {
      throw new Error(`Repository or README not found: ${normalized}`);
    }
    throw new Error(`Unable to load README (${readmeResponse.status}).`);
  }

  const markdown = await readmeResponse.text();
  const rendered = await renderMarkdownToHtml(markdown, normalized);
  const repoMeta = await fetchRepoDetail(normalized);
  const header = buildProjectHeaderHtml(repoMeta);

  const html = [header, rendered].join("\n");

  projectReadmeCache.set(cacheKey, html);
  return html;
};
