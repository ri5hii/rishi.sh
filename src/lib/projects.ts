// GitHub username used for live repository listing in the base projects command.
const GITHUB_USERNAME = "ri5hii";
const PROJECT_SHEET_ROOT = "/project-sheet";
const PROJECT_SHEET_MANIFEST_URL = `${PROJECT_SHEET_ROOT}/manifest.json`;

// Add project names here to hide them from `projects` listing/details.
const EXCLUDED_PROJECT_NAMES: string[] = ["zinnia"];
const EXCLUDED_PROJECT_SET = new Set(
  EXCLUDED_PROJECT_NAMES.map((name) => name.trim().toLowerCase()).filter(
    Boolean,
  ),
);

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

// Manifest shape mapping repo names to project sheet file paths.
type ProjectSheetManifest = Record<string, string>;

const projectIndexCache = new Map<string, string>();
const projectDetailCache = new Map<string, string>();
let projectSheetManifestCache: Map<string, string> | null = null;
let repoSummaryCache: RepoSummary[] | null = null;

// Escapes dynamic text before injection into html output.
const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

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

// Normalizes repository identifiers for case-insensitive comparisons.
const normalizeRepoName = (repoName: string) => repoName.trim().toLowerCase();

// Checks if a project is excluded by local config.
const isProjectExcluded = (name: string) =>
  EXCLUDED_PROJECT_SET.has(normalizeRepoName(name));

// Sanitizes sheet paths from manifest entries into public-root absolute html paths.
const normalizeSheetPath = (rawPath: string) => {
  const trimmed = rawPath.trim();
  if (!trimmed || trimmed.includes("..")) return null;

  const withoutLeadingSlash = trimmed.replace(/^\/+/, "");
  const prefixed = withoutLeadingSlash.startsWith("project-sheet/")
    ? withoutLeadingSlash
    : `project-sheet/${withoutLeadingSlash}`;

  if (!prefixed.endsWith(".html")) return null;
  return `/${prefixed}`;
};

// Loads and memoizes the project sheet manifest mapping.
const fetchProjectSheetManifest = async (): Promise<Map<string, string>> => {
  if (projectSheetManifestCache) return projectSheetManifestCache;

  const response = await fetch(
    resolvePublicFetchUrl(PROJECT_SHEET_MANIFEST_URL),
    {
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Unable to load project sheet manifest (${response.status}).`,
    );
  }

  const rawText = await response.text();
  if (!rawText.trim()) {
    projectSheetManifestCache = new Map<string, string>();
    return projectSheetManifestCache;
  }

  let rawManifest: unknown;
  try {
    rawManifest = JSON.parse(rawText) as unknown;
  } catch {
    throw new Error("Invalid JSON in /project-sheet/manifest.json.");
  }

  if (
    !rawManifest ||
    typeof rawManifest !== "object" ||
    Array.isArray(rawManifest)
  ) {
    throw new Error("Project sheet manifest must be a key/value JSON object.");
  }

  const normalized = new Map<string, string>();
  for (const [key, value] of Object.entries(
    rawManifest as ProjectSheetManifest,
  )) {
    if (typeof value !== "string") continue;

    const repoName = normalizeRepoName(key);
    if (!repoName) continue;

    const normalizedPath = normalizeSheetPath(value);
    if (!normalizedPath) continue;

    normalized.set(repoName, normalizedPath);
  }

  projectSheetManifestCache = normalized;
  return normalized;
};

// Fetches repositories from GitHub for the live projects index.
const fetchRepos = async (): Promise<RepoSummary[]> => {
  if (repoSummaryCache) return repoSummaryCache;

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

  repoSummaryCache = (await response.json()) as RepoSummary[];
  return repoSummaryCache;
};

// Builds the live GitHub projects index shown for the base `projects` command.
export const fetchProjectsIndexHtml = async (
  includeAll = false,
): Promise<string> => {
  const exclusionKey = Array.from(EXCLUDED_PROJECT_SET).sort().join(",");
  const cacheKey = `${includeAll ? "all" : "default"}:${exclusionKey}`;
  const cached = projectIndexCache.get(cacheKey);
  if (cached) return cached;

  const repos = await fetchRepos();
  const filtered = (
    includeAll ? repos : repos.filter((repo) => !repo.archived)
  ).filter((repo) => !isProjectExcluded(repo.name));

  const items = filtered
    .map((repo) => {
      const description = repo.description
        ? escapeHtml(repo.description)
        : "No description provided.";

      return `<li><a href="${repo.html_url}">${escapeHtml(repo.name)}</a> — ${description} (★ ${repo.stargazers_count})</li>`;
    })
    .join("\n");

  const html = [
    `<h2>Projects — ${GITHUB_USERNAME}</h2>`,
    "<p>Repository list is fetched live from GitHub. Detailed project output is resolved from <code>/public/project-sheet/manifest.json</code>.</p>",
    `<ul>${items || "<li>No projects available.</li>"}</ul>`,
    "<p>Run <code>projects &lt;repo&gt;</code> to open a project sheet.</p>",
  ].join("\n");

  projectIndexCache.set(cacheKey, html);
  return html;
};

// Loads manifest-mapped project sheet html for `projects <name>`.
export const fetchProjectReadmeHtml = async (
  repoName: string,
): Promise<string> => {
  const normalized = repoName.trim();
  if (!normalized) {
    throw new Error(
      "Please provide a project name. Example: projects rishi.sh",
    );
  }

  if (isProjectExcluded(normalized)) {
    throw new Error(`Project is excluded by local config: ${normalized}`);
  }

  const cacheKey = normalizeRepoName(normalized);
  const cached = projectDetailCache.get(cacheKey);
  if (cached) return cached;

  const repos = await fetchRepos();
  const hasRepo = repos.some(
    (repo) => normalizeRepoName(repo.name) === cacheKey,
  );

  if (!hasRepo) {
    throw new Error("repo name wrong.");
  }

  const manifest = await fetchProjectSheetManifest();

  const sheetPath = manifest.get(cacheKey);
  if (!sheetPath) {
    throw new Error(
      `No project-sheet manifest entry for: ${normalized}. Add it to /public/project-sheet/manifest.json.`,
    );
  }

  const response = await fetch(resolvePublicFetchUrl(sheetPath), {
    headers: {
      Accept: "text/html, text/plain",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Unable to load project sheet for ${normalized} (${response.status}).`,
    );
  }

  const html = await response.text();
  if (!html.trim()) {
    throw new Error(`Project sheet is empty for: ${normalized}`);
  }

  projectDetailCache.set(cacheKey, html);
  return html;
};
