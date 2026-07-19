import fs from "node:fs/promises";

const config = JSON.parse(await fs.readFile(new URL("../config.json", import.meta.url), "utf8"));
const THEMES = {
  "tokyonight": {
    "bg": "#1a1b27",
    "panel": "#16161e",
    "panel2": "#1f2335",
    "border": "#414868",
    "text": "#c0caf5",
    "muted": "#9aa5ce",
    "accent": "#7aa2f7",
    "accent2": "#bb9af7",
    "good": "#9ece6a",
    "warn": "#e0af68",
    "danger": "#f7768e"
  },
  "dark": {
    "bg": "#0d1117",
    "panel": "#161b22",
    "panel2": "#0f1720",
    "border": "#30363d",
    "text": "#c9d1d9",
    "muted": "#8b949e",
    "accent": "#58a6ff",
    "accent2": "#a371f7",
    "good": "#3fb950",
    "warn": "#d29922",
    "danger": "#f85149"
  }
};

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
const headers = {
  "User-Agent": "github-readme-stats-actions-root",
  "Accept": "application/vnd.github+json",
  ...(token ? { Authorization: `Bearer ${token}` } : {})
};

const LANG_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Java: "#b07219",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Bash: "#89e051",
  Go: "#00ADD8",
  Rust: "#dea584",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  PHP: "#4F5D95",
  Ruby: "#701516",
  Dart: "#00B4AB",
  Swift: "#f05138",
  Kotlin: "#A97BFF",
  Vue: "#41b883",
  Markdown: "#083fa1",
  YAML: "#cb171e",
  JSON: "#292929"
};

function esc(v = "") {
  return String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function nfmt(v) {
  return new Intl.NumberFormat("en-US").format(v ?? 0);
}

function pct(v) {
  return `${Math.round((v || 0) * 1000) / 10}%`;
}

function themeOf(name) {
  return THEMES[(name || "tokyonight").toLowerCase()] || THEMES.tokyonight;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}\n${text}`);
  }
  return res.json();
}

async function fetchRepos(username) {
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const repos = await fetchJson(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}&sort=pushed`);
    if (!Array.isArray(repos) || repos.length === 0) break;
    all.push(...repos);
    if (repos.length < 100) break;
  }
  return all;
}

async function fetchLanguages(owner, repo) {
  return fetchJson(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/languages`);
}

function computeSimpleStreak() {
  return { total: 0, currentStreak: 0, longestStreak: 0 };
}

function shell(theme, width, height, title, subtitle) {
  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${theme.bg}" />
        <stop offset="100%" stop-color="${theme.panel}" />
      </linearGradient>
      <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${theme.accent2}" stop-opacity="0.16" />
        <stop offset="100%" stop-color="${theme.accent}" stop-opacity="0" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="url(#bg)" stroke="${theme.border}" />
    <rect x="16" y="16" width="${width - 32}" height="${height - 32}" rx="12" fill="none" stroke="${theme.border}" opacity="0.65" />
    <rect x="16" y="16" width="${width - 32}" height="56" rx="12" fill="url(#shine)" opacity="0.85" />
    <text x="36" y="48" fill="${theme.text}" font-size="22" font-weight="700" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">${esc(title)}</text>
    <text x="36" y="72" fill="${theme.muted}" font-size="12.5" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">${esc(subtitle)}</text>
  `;
}

function tile(theme, x, y, w, h, label, value, color) {
  return `
    <g transform="translate(${x},${y})">
      <rect x="0" y="0" width="${w}" height="${h}" rx="12" fill="${theme.panel2}" stroke="${theme.border}" />
      <circle cx="16" cy="20" r="4" fill="${color}" />
      <text x="28" y="22" fill="${theme.muted}" font-size="11.5" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">${esc(label)}</text>
      <text x="28" y="48" fill="${color}" font-size="21" font-weight="700" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">${esc(value)}</text>
    </g>
  `;
}

function langColor(name, theme) {
  return LANG_COLORS[name] || theme.accent;
}

function buildStatsCard(theme, username, user, totalStars, streak) {
  return `
  ${shell(theme, 780, 420, config.stats.custom_title || "GitHub Stats", `@${username} · GitHub Actions generated`)}
    <g transform="translate(32,102)">
      <rect x="0" y="0" width="716" height="84" rx="14" fill="${theme.panel2}" stroke="${config.stats.hide_border ? "none" : theme.border}" />
      <text x="18" y="27" fill="${theme.text}" font-size="18" font-weight="700" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">${esc(user.name || user.login || username)}</text>
      <text x="18" y="49" fill="${theme.muted}" font-size="12.5" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">${esc(user.bio || "Open-source profile snapshot")}</text>
      <text x="18" y="70" fill="${theme.muted}" font-size="12.5" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">${esc([user.company, user.location].filter(Boolean).join(" · "))}</text>
      <text x="698" y="27" fill="${theme.muted}" text-anchor="end" font-size="11.5" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">followers · stars · commits</text>
      <text x="698" y="49" fill="${theme.muted}" text-anchor="end" font-size="11.5" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">generated by GitHub Actions</text>
      <text x="698" y="70" fill="${theme.muted}" text-anchor="end" font-size="11.5" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">Node.js 24</text>
    </g>
    ${tile(theme, 32, 210, 222, 60, "Repositories", nfmt(user.public_repos), theme.accent)}
    ${tile(theme, 270, 210, 222, 60, "Stars", nfmt(totalStars), theme.good)}
    ${tile(theme, 508, 210, 222, 60, "Followers", nfmt(user.followers), theme.warn)}
    ${tile(theme, 32, 282, 222, 60, "Following", nfmt(user.following), theme.danger)}
    ${tile(theme, 270, 282, 222, 60, "Gists", nfmt(user.public_gists), theme.accent2)}
    ${tile(theme, 508, 282, 222, 60, "Streak", nfmt(streak.currentStreak), theme.accent)}
    <g transform="translate(32,348)">
      <rect x="0" y="0" width="716" height="44" rx="12" fill="${theme.panel2}" stroke="${config.stats.hide_border ? "none" : theme.border}" />
      <text x="18" y="28" fill="${theme.text}" font-size="13" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">Commits this year: ${nfmt(streak.total)} · Longest streak: ${nfmt(streak.longestStreak)}</text>
    </g>
  </svg>`.trim();
}

function buildLanguagesCard(theme, username, langs) {
  const width = 780;
  const height = 130 + Math.max(1, langs.length) * 38;
  const max = Math.max(1, ...langs.map(x => x.value));
  return `
  ${shell(theme, width, height, "Top Languages", `@${username} · compact`)}
    <text x="36" y="124" fill="${theme.muted}" font-size="12.5" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">Based on public repositories</text>
    ${langs.length ? langs.map((lang, idx) => {
      const y = 150 + idx * 38;
      const barWidth = Math.max(16, Math.round((lang.value / max) * 610));
      return `
        <g transform="translate(0,${y})">
          <text x="36" y="13" fill="${theme.text}" font-size="13" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">${esc(lang.name)}</text>
          <text x="744" y="13" fill="${theme.muted}" font-size="13" text-anchor="end" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">${config.top_langs.stats_format === "bytes" ? nfmt(lang.bytes) + " bytes" : pct(lang.share)}</text>
          <rect x="36" y="20" width="684" height="10" rx="5" fill="${theme.border}" opacity="0.25" />
          <rect x="36" y="20" width="${barWidth}" height="10" rx="5" fill="${langColor(lang.name, theme)}" />
        </g>
      `;
    }).join("") : `<text x="36" y="154" fill="${theme.muted}" font-size="13" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">No language data found.</text>`}
  </svg>`.trim();
}

function buildRepoCard(theme, repo) {
  return `
  ${shell(theme, 780, 230, `${repo.owner.login}/${repo.name}`, "Repository summary")}
    <text x="36" y="122" fill="${theme.muted}" font-size="12.5" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">${esc(repo.description || "No description provided")}</text>

    <g transform="translate(36,146)">
      <rect x="0" y="0" width="198" height="56" rx="12" fill="${theme.panel2}" stroke="${theme.border}" />
      <text x="14" y="21" fill="${theme.muted}" font-size="11.5" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">Stars</text>
      <text x="14" y="42" fill="${theme.good}" font-size="20" font-weight="700" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">${nfmt(repo.stargazers_count)}</text>
    </g>
    <g transform="translate(244,146)">
      <rect x="0" y="0" width="198" height="56" rx="12" fill="${theme.panel2}" stroke="${theme.border}" />
      <text x="14" y="21" fill="${theme.muted}" font-size="11.5" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">Forks</text>
      <text x="14" y="42" fill="${theme.warn}" font-size="20" font-weight="700" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">${nfmt(repo.forks_count)}</text>
    </g>
    <g transform="translate(452,146)">
      <rect x="0" y="0" width="198" height="56" rx="12" fill="${theme.panel2}" stroke="${theme.border}" />
      <text x="14" y="21" fill="${theme.muted}" font-size="11.5" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">Language</text>
      <text x="14" y="42" fill="${langColor(repo.language || "Unknown", theme)}" font-size="20" font-weight="700" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">${esc(repo.language || "Unknown")}</text>
    </g>
    <g transform="translate(660,146)">
      <rect x="0" y="0" width="84" height="56" rx="12" fill="${theme.panel2}" stroke="${theme.border}" />
      <text x="42" y="21" fill="${theme.muted}" text-anchor="middle" font-size="11.5" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">Watchers</text>
      <text x="42" y="42" fill="${theme.accent2}" text-anchor="middle" font-size="20" font-weight="700" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">${nfmt(repo.subscribers_count || 0)}</text>
    </g>
  </svg>`.trim();
}

function buildStreakCard(theme, streak) {
  const width = 780;
  const height = 250;
  const maxWidth = 650;
  const pctValue = streak.longestStreak ? Math.min(1, streak.currentStreak / streak.longestStreak) : 0;
  const barWidth = Math.max(24, Math.round(pctValue * maxWidth));
  return `
  ${shell(theme, width, height, "GitHub Streak", "@profile snapshot")}
    <g transform="translate(36,110)">
      <rect x="0" y="0" width="708" height="100" rx="14" fill="${theme.panel2}" stroke="${theme.border}" />
      <text x="18" y="28" fill="${theme.text}" font-size="18" font-weight="700" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">Contribution streak</text>
      <text x="18" y="51" fill="${theme.muted}" font-size="12.5" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">${nfmt(streak.currentStreak)} current days · ${nfmt(streak.longestStreak)} longest days · ${nfmt(streak.total)} total contributions</text>
      <rect x="18" y="68" width="${maxWidth}" height="12" rx="6" fill="${theme.border}" opacity="0.22" />
      <rect x="18" y="68" width="${barWidth}" height="12" rx="6" fill="${theme.accent}" />
      <text x="678" y="78" fill="${theme.muted}" text-anchor="end" font-size="12" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif">${pct(pctValue)}</text>
    </g>
  </svg>`.trim();
}

async function writeRoot(filename, content) {
  const rootPath = new URL(`../${filename}`, import.meta.url);
  let old = null;
  try { old = await fs.readFile(rootPath, "utf8"); } catch {}
  if (old !== content) {
    await fs.writeFile(rootPath, content, "utf8");
    console.log(`Updated ${filename}`);
  } else {
    console.log(`Skipped ${filename} (unchanged)`);
  }
}

async function main() {
  const theme = themeOf(config.user.theme);
  const username = config.user.username;

  let user;
  let repos = [];
  let streak = { total: 0, currentStreak: 0, longestStreak: 0 };

  try {
    user = await fetchJson(`https://api.github.com/users/${encodeURIComponent(username)}`);
    repos = await fetchRepos(username);
  } catch (err) {
    console.error(`Offline fallback: ${err?.message || err}`);
    user = {
      login: username,
      name: config.user.title || username,
      bio: "Offline fallback data",
      company: "",
      location: "",
      public_repos: 0,
      public_gists: 0,
      followers: 0,
      following: 0
    };
  }

  const totalStars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);

  const languageBytes = new Map();
  const exclude = new Set((config.top_langs.exclude_repo || []).map(String));
  for (const repo of repos.slice(0, 100)) {
    if (exclude.has(repo.name)) continue;
    try {
      const data = await fetchLanguages(username, repo.name);
      for (const [lang, bytes] of Object.entries(data)) {
        languageBytes.set(lang, (languageBytes.get(lang) || 0) + bytes);
      }
    } catch {}
  }

  const totalBytes = [...languageBytes.values()].reduce((s, b) => s + b, 0);
  const languages = [...languageBytes.entries()]
    .map(([name, bytes]) => ({
      name,
      bytes,
      share: totalBytes ? bytes / totalBytes : 0,
      value: config.top_langs.stats_format === "bytes" ? bytes : (totalBytes ? bytes / totalBytes : 0)
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, Math.max(1, config.top_langs.langs_count || 6));

  const topRepo = repos
    .filter(r => !r.fork)
    .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))[0] || {
      owner: { login: username },
      name: config.repo_card.repo || "repo",
      description: "Offline fallback data",
      stargazers_count: 0,
      forks_count: 0,
      language: "Unknown",
      subscribers_count: 0
    };

  await writeRoot("stats.svg", buildStatsCard(theme, username, user, totalStars, streak));
  await writeRoot("top-langs.svg", buildLanguagesCard(theme, username, languages));
  await writeRoot("repo-card.svg", buildRepoCard(theme, topRepo));
  await writeRoot("streak.svg", buildStreakCard(theme, streak));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
