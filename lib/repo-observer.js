const TEXT_LIMIT_PER_FILE = 7000;
const MAX_MODEL_FILES = 14;
const MAX_MODEL_CHARS = 76000;

const EXT_LANG = {
  ".js": "JavaScript", ".jsx": "JavaScript", ".mjs": "JavaScript", ".cjs": "JavaScript",
  ".ts": "TypeScript", ".tsx": "TypeScript",
  ".py": "Python", ".rb": "Ruby", ".go": "Go", ".rs": "Rust",
  ".java": "Java", ".kt": "Kotlin", ".kts": "Kotlin",
  ".c": "C", ".h": "C/C++", ".cc": "C++", ".cpp": "C++", ".hpp": "C++",
  ".cs": "C#", ".php": "PHP", ".swift": "Swift",
  ".html": "HTML", ".css": "CSS", ".scss": "SCSS", ".vue": "Vue", ".svelte": "Svelte",
  ".sql": "SQL", ".sh": "Shell", ".yaml": "YAML", ".yml": "YAML", ".json": "JSON",
  ".toml": "TOML", ".md": "Markdown"
};

const BINARY_EXT = new Set([
  ".png",".jpg",".jpeg",".gif",".webp",".ico",".pdf",".zip",".gz",".tar",".7z",
  ".woff",".woff2",".ttf",".eot",".mp3",".mp4",".mov",".avi",".bin",".exe",".dll",
  ".so",".dylib",".class",".jar",".pyc",".lock"
]);

const HIGH_VALUE_EXACT = new Set([
  "readme.md","readme","agents.md","contributing.md",
  "package.json","pyproject.toml","requirements.txt","cargo.toml","go.mod","pom.xml",
  "dockerfile","docker-compose.yml","docker-compose.yaml","vercel.json",
  "tsconfig.json","vite.config.js","vite.config.ts","next.config.js","next.config.mjs",
  ".env.example",".github/copilot-instructions.md"
]);

function extension(path) {
  const base = path.toLowerCase().split("/").pop() || "";
  const i = base.lastIndexOf(".");
  return i > 0 ? base.slice(i) : "";
}

function parseGitHubUrl(value) {
  let raw = String(value || "").trim();
  if (!raw) throw new Error("A GitHub repository URL is required.");

  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
  const url = new URL(raw);
  if (!["github.com", "www.github.com"].includes(url.hostname.toLowerCase())) {
    throw new Error("The first environment adapter currently accepts GitHub repositories.");
  }

  const parts = url.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  if (parts.length < 2) throw new Error("Use a repository URL like https://github.com/owner/repo.");

  return {
    owner: parts[0],
    repo: parts[1].replace(/\.git$/i, "")
  };
}

function githubHeaders() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Sophron-Environment-Compiler/0.1",
    "X-GitHub-Api-Version": "2026-03-10"
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: githubHeaders() });
  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = body?.message ? `: ${body.message}` : "";
    } catch {}
    const error = new Error(`GitHub request failed (${response.status})${detail}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function pathScore(path, size) {
  const lower = path.toLowerCase();
  const base = lower.split("/").pop();
  const depth = path.split("/").length - 1;
  let score = 0;

  if (HIGH_VALUE_EXACT.has(lower) || HIGH_VALUE_EXACT.has(base)) score += 100;
  if (/^readme/i.test(base)) score += 90;
  if (/^\.github\/workflows\//.test(lower)) score += 74;
  if (/(^|\/)(src|app|lib|api|server|backend|frontend)\//.test(lower)) score += 48;
  if (/(^|\/)(index|main|server|app|router|routes)\.[a-z0-9]+$/.test(lower)) score += 42;
  if (/(test|spec)\.[a-z0-9]+$/.test(lower) || /(^|\/)(test|tests|spec|specs)\//.test(lower)) score += 30;
  if (/docs\//.test(lower) || /adr/i.test(lower)) score += 22;
  if (/config|schema|migration|route|auth|payment|worker|queue|deploy|infra/.test(lower)) score += 14;
  if (depth <= 1) score += 12;
  if (size && size < 30000) score += 5;
  if (size && size > 150000) score -= 80;
  if (lower.includes("node_modules/") || lower.includes("vendor/") || lower.includes("dist/") || lower.includes("build/")) score -= 200;

  return score;
}

function reasonForPath(path) {
  const lower = path.toLowerCase();
  const base = lower.split("/").pop();
  if (/^readme/.test(base)) return "repository overview";
  if (base === "agents.md" || lower.includes("copilot-instructions")) return "agent/project instructions";
  if (["package.json","pyproject.toml","cargo.toml","go.mod","pom.xml","requirements.txt"].includes(base)) return "dependency and command manifest";
  if (lower.startsWith(".github/workflows/")) return "CI/CD workflow";
  if (/docker|vercel|config|tsconfig|vite|next\.config/.test(lower)) return "runtime/build configuration";
  if (/(test|spec)/.test(lower)) return "verification surface";
  if (/(^|\/)(index|main|server|app|router|routes)\./.test(lower)) return "likely entry point";
  return "high-signal source file";
}

function summarizeTree(blobs) {
  const langCounts = {};
  let testFiles = 0, docs = 0, workflows = 0, configs = 0, sourceFiles = 0;
  const packageManagers = new Set();

  for (const item of blobs) {
    const path = item.path;
    const lower = path.toLowerCase();
    const ext = extension(path);
    const lang = EXT_LANG[ext];
    if (lang) langCounts[lang] = (langCounts[lang] || 0) + 1;

    if (/(^|\/)(test|tests|spec|specs)\//.test(lower) || /(test|spec)\.[a-z0-9]+$/.test(lower)) testFiles++;
    if (/^readme/i.test(lower.split("/").pop()) || lower.startsWith("docs/")) docs++;
    if (lower.startsWith(".github/workflows/")) workflows++;
    if (/config|docker|vercel\.json|tsconfig|pyproject|package\.json|cargo\.toml|go\.mod|requirements/.test(lower)) configs++;
    if ([".js",".jsx",".ts",".tsx",".py",".rb",".go",".rs",".java",".kt",".c",".cc",".cpp",".cs",".php",".swift"].includes(ext)) sourceFiles++;

    const base = lower.split("/").pop();
    if (base === "package.json" || base === "package-lock.json") packageManagers.add("npm");
    if (base === "pnpm-lock.yaml") packageManagers.add("pnpm");
    if (base === "yarn.lock") packageManagers.add("yarn");
    if (base === "pyproject.toml" || base === "requirements.txt") packageManagers.add("python");
    if (base === "cargo.toml") packageManagers.add("cargo");
    if (base === "go.mod") packageManagers.add("go modules");
    if (base === "pom.xml") packageManagers.add("maven");
  }

  const languages = Object.entries(langCounts)
    .sort((a,b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, files]) => ({ name, files }));

  return {
    totalFiles: blobs.length,
    sourceFiles,
    testFiles,
    documentationFiles: docs,
    workflowFiles: workflows,
    configFiles: configs,
    languages,
    packageManagers: [...packageManagers]
  };
}

async function fetchRawFile(owner, repo, branch, path) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const encodedBranch = encodeURIComponent(branch);
  const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodedBranch}/${encodedPath}`;
  const response = await fetch(url, { headers: { "User-Agent": "Sophron-Environment-Compiler/0.1" } });
  if (!response.ok) return null;

  const text = await response.text();
  if (text.includes("\u0000")) return null;
  return text.slice(0, TEXT_LIMIT_PER_FILE);
}

function extractPackageFacts(documents) {
  const facts = { scripts: [], dependencies: [], frameworks: [] };
  const packageDoc = documents.find((d) => d.path.toLowerCase() === "package.json");
  if (!packageDoc) return facts;

  try {
    const pkg = JSON.parse(packageDoc.content);
    facts.scripts = Object.entries(pkg.scripts || {}).slice(0, 16).map(([name, command]) => ({ name, command: String(command).slice(0, 220) }));

    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    facts.dependencies = Object.keys(deps).slice(0, 40);

    const frameworkMap = {
      next: "Next.js", react: "React", vue: "Vue", svelte: "Svelte",
      express: "Express", fastify: "Fastify", hono: "Hono",
      jest: "Jest", vitest: "Vitest", playwright: "Playwright", cypress: "Cypress",
      prisma: "Prisma", drizzle: "Drizzle", tailwindcss: "Tailwind CSS"
    };
    facts.frameworks = Object.keys(frameworkMap).filter((key) => deps[key]).map((key) => frameworkMap[key]);
  } catch {}

  return facts;
}

async function observeRepository(repoUrl) {
  const { owner, repo } = parseGitHubUrl(repoUrl);
  const metadata = await fetchJson(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  const branch = metadata.default_branch || "main";
  const tree = await fetchJson(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`);

  const blobs = (tree.tree || []).filter((item) => item.type === "blob");
  const readable = blobs.filter((item) => !BINARY_EXT.has(extension(item.path)));
  const structural = summarizeTree(blobs);

  const ranked = readable
    .map((item) => ({ ...item, score: pathScore(item.path, item.size || 0) }))
    .filter((item) => item.score > -50)
    .sort((a,b) => b.score - a.score || (a.size || 0) - (b.size || 0));

  const unique = [];
  const seen = new Set();
  for (const item of ranked) {
    if (seen.has(item.path)) continue;
    seen.add(item.path);
    unique.push(item);
    if (unique.length >= MAX_MODEL_FILES) break;
  }

  const fetched = await Promise.all(unique.map(async (item) => {
    const content = await fetchRawFile(owner, repo, branch, item.path);
    if (!content) return null;
    return {
      path: item.path,
      size: item.size || content.length,
      reason: reasonForPath(item.path),
      content
    };
  }));

  const documents = [];
  let chars = 0;
  for (const doc of fetched.filter(Boolean)) {
    if (chars >= MAX_MODEL_CHARS) break;
    const room = MAX_MODEL_CHARS - chars;
    const content = doc.content.slice(0, room);
    documents.push({ ...doc, content });
    chars += content.length;
  }

  const packageFacts = extractPackageFacts(documents);

  return {
    identity: {
      owner,
      repo,
      fullName: metadata.full_name || `${owner}/${repo}`,
      description: metadata.description || "",
      defaultBranch: branch,
      snapshotSha: tree.sha || null,
      htmlUrl: metadata.html_url || repoUrl,
      archived: Boolean(metadata.archived),
      private: Boolean(metadata.private),
      pushedAt: metadata.pushed_at || null
    },
    structural: {
      ...structural,
      frameworks: packageFacts.frameworks,
      scripts: packageFacts.scripts,
      dependenciesSample: packageFacts.dependencies
    },
    evidence: documents.map((doc) => ({
      path: doc.path,
      size: doc.size,
      reason: doc.reason
    })),
    warnings: [
      ...(tree.truncated ? ["GitHub truncated the recursive tree; the observer saw a partial repository tree."] : []),
      ...(documents.length < 4 ? ["Only a small amount of high-signal text could be read from this repository."] : [])
    ],
    fileIndex: blobs.map((item) => ({ path: item.path, size: item.size || 0 })),
    documents
  };
}

function queryNeedles(query) {
  const text = String(query || "");
  const needles = new Set();

  const callPatterns = [
    /(?:document\.)?getElementById\(\s*["'][^"']+["']\s*\)/g,
    /querySelector\(\s*["'][^"']+["']\s*\)/g,
    /querySelectorAll\(\s*["'][^"']+["']\s*\)/g
  ];
  for (const pattern of callPatterns) {
    for (const match of text.matchAll(pattern)) needles.add(match[0]);
  }

  const identifiers = text.match(/\b[A-Za-z_$][A-Za-z0-9_$]{5,}\b/g) || [];
  const stop = new Set(["delete","remove","change","update","handler","contact","submit","ensure","without","proposed","action","repository","google","unrelated"]);
  for (const token of identifiers) {
    if (!stop.has(token.toLowerCase())) needles.add(token);
    if (needles.size >= 12) break;
  }
  return [...needles].slice(0, 12);
}

function explicitPaths(query, fileIndex) {
  const text = String(query || "");
  const mentioned = text.match(/(?:[A-Za-z0-9_.@-]+\/)*[A-Za-z0-9_.@-]+\.(?:js|jsx|mjs|cjs|ts|tsx|py|rb|go|rs|java|kt|c|cc|cpp|h|hpp|cs|php|swift|html|css|scss|vue|svelte|json|yaml|yml|toml|md|sql|sh)/gi) || [];
  const lookup = new Map(fileIndex.map((x) => [x.path.toLowerCase(), x.path]));
  return [...new Set(mentioned.map((p) => lookup.get(p.toLowerCase())).filter(Boolean))];
}

async function fetchFullRaw(owner, repo, branch, path, maxChars = 180000) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const encodedBranch = encodeURIComponent(branch);
  const url = "https://raw.githubusercontent.com/" + encodeURIComponent(owner) + "/" + encodeURIComponent(repo) + "/" + encodedBranch + "/" + encodedPath;
  const response = await fetch(url, { headers: { "User-Agent": "Sophron-Environment-Compiler/0.1" } });
  if (!response.ok) return null;
  const text = await response.text();
  if (text.includes("\u0000")) return null;
  return { text: text.slice(0, maxChars), truncated: text.length > maxChars };
}

function countOccurrences(text, needle) {
  if (!needle) return 0;
  const haystack = text.toLowerCase();
  const target = needle.toLowerCase();
  let count = 0;
  let pos = 0;
  while ((pos = haystack.indexOf(target, pos)) >= 0) {
    count++;
    pos += Math.max(1, target.length);
  }
  return count;
}

function makeSnippets(text, needles) {
  const snippets = [];
  const lower = text.toLowerCase();
  for (const needle of needles) {
    const i = lower.indexOf(needle.toLowerCase());
    if (i < 0) continue;
    const start = Math.max(0, i - 650);
    const end = Math.min(text.length, i + needle.length + 900);
    snippets.push(text.slice(start, end));
    if (snippets.length >= 3) break;
  }
  if (!snippets.length) {
    const head = text.slice(0, 1200);
    const tail = text.length > 1600 ? text.slice(-1200) : "";
    snippets.push(head + (tail ? "\n...\n" + tail : ""));
  }
  return snippets;
}

async function inspectActionEvidence(observation, query) {
  const index = observation.fileIndex || [];
  const needles = queryNeedles(query);
  const explicit = explicitPaths(query, index);
  const terms = String(query || "").toLowerCase().match(/[a-z0-9_]{4,}/g) || [];

  const ranked = index
    .map((item) => {
      const lower = item.path.toLowerCase();
      let score = explicit.includes(item.path) ? 1000 : 0;
      for (const term of terms) if (lower.includes(term)) score += 12;
      score += pathScore(item.path, item.size);
      return { ...item, score };
    })
    .filter((x) => x.score > 20)
    .sort((a,b) => b.score - a.score)
    .slice(0, explicit.length ? Math.max(3, explicit.length) : 4);

  const targets = [];
  for (const item of ranked) {
    const raw = await fetchFullRaw(
      observation.identity.owner,
      observation.identity.repo,
      observation.identity.defaultBranch,
      item.path
    );
    if (!raw) continue;

    targets.push({
      path: item.path,
      size: item.size,
      completeSearch: !raw.truncated,
      matches: needles.map((needle) => ({ needle, count: countOccurrences(raw.text, needle) })),
      snippets: makeSnippets(raw.text, needles)
    });
  }

  return { needles, targets };
}

module.exports = {
  observeRepository,
  parseGitHubUrl,
  inspectActionEvidence
};
