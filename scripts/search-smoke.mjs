const BASE_URL = process.env.WEDGES_SITE_URL || "http://localhost:3000";

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

async function get(path) {
  const response = await fetch(new URL(path, BASE_URL));
  assert(response.ok, `${path} returns ${response.status}`);
  return { response, body: await response.text() };
}

function tagWithAttribute(html, tagName, attribute, value) {
  const tags = html.match(new RegExp(`<${tagName}\\b[^>]*>`, "gi")) ?? [];
  return tags.filter((tag) =>
    new RegExp(`\\b${attribute}=["']${value}["']`, "i").test(tag),
  );
}

function attributeValue(tag, attribute) {
  return tag.match(new RegExp(`\\b${attribute}=["']([^"']+)["']`, "i"))?.[1];
}

function canonicalUrls(html) {
  return tagWithAttribute(html, "link", "rel", "canonical").map((tag) => {
    const href = attributeValue(tag, "href");
    return href ? new URL(href).href : undefined;
  });
}

function jsonLdDocuments(html) {
  return [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map(
    (match) => JSON.parse(match[1]),
  );
}

const { body: homeHtml } = await get("/");
assert(
  JSON.stringify(canonicalUrls(homeHtml)) === JSON.stringify(["https://wedges.dev/"]),
  "homepage has one canonical URL",
);

const jsonLd = jsonLdDocuments(homeHtml);
const website = jsonLd.find((document) => document["@type"] === "WebSite");
const software = jsonLd.find((document) => document["@type"] === "SoftwareApplication");
assert(website?.url === "https://wedges.dev/", "homepage has WebSite JSON-LD");
assert(software?.url === "https://wedges.dev/", "homepage has SoftwareApplication JSON-LD");
assert(
  software?.sameAs === "https://github.com/WalksWithASwagger/wedges",
  "software schema links the public source",
);
assert(
  software?.isBasedOn?.url === "https://www.bothhandsfull.com/",
  "software schema records the visible Both Hands Full relationship",
);
assert(
  !["author", "creator", "owner", "provider", "publisher"].some((field) => field in software),
  "software schema does not invent an owner or organization",
);

const { body: clubHtml } = await get("/club");
assert(
  JSON.stringify(canonicalUrls(clubHtml)) === JSON.stringify(["https://wedges.dev/club"]),
  "Film Club hub has one canonical URL",
);

const { body: reviewHtml } = await get("/review");
assert(JSON.stringify(canonicalUrls(reviewHtml)) === JSON.stringify(["https://wedges.dev/review"]), "browser review has one canonical URL");
assert(reviewHtml.includes("Get cited critique") && reviewHtml.includes("No autosave"), "browser review exposes the action and session-only boundary");
assert(homeHtml.includes('href="/review"'), "homepage links directly to browser review");

const { body: roomHtml } = await get("/club/example-room");
const roomRobots = tagWithAttribute(roomHtml, "meta", "name", "robots");
assert(roomRobots.length === 1, "private room has one robots meta tag");
const roomRobotsDirectives = new Set(
  (attributeValue(roomRobots[0], "content") ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase()),
);
assert(
  roomRobotsDirectives.has("noindex") && roomRobotsDirectives.has("nofollow"),
  "private room is noindex, nofollow",
);
assert(canonicalUrls(roomHtml).length === 0, "private room has no code-bearing canonical URL");

const robots = await get("/robots.txt");
assert(
  robots.response.headers.get("content-type")?.startsWith("text/plain"),
  "robots.txt is plain text",
);
assert(/User-Agent:\s*\*/i.test(robots.body), "robots.txt addresses all crawlers");
assert(/Allow:\s*\/$/im.test(robots.body), "robots.txt allows public pages");
assert(/Disallow:\s*\/api\/$/im.test(robots.body), "robots.txt excludes API routes");
assert(
  /Sitemap:\s*https:\/\/wedges\.dev\/sitemap\.xml$/im.test(robots.body),
  "robots.txt names the canonical sitemap",
);

const sitemap = await get("/sitemap.xml");
assert(
  /^(application|text)\/xml\b/.test(sitemap.response.headers.get("content-type") ?? ""),
  "sitemap.xml is XML",
);
const sitemapUrls = [...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assert(
  JSON.stringify(sitemapUrls) ===
    JSON.stringify(["https://wedges.dev/", "https://wedges.dev/review", "https://wedges.dev/club"]),
  "sitemap contains exactly the three stable public pages and no room codes",
);

const llms = await get("/llms.txt");
assert(
  llms.response.headers.get("content-type")?.startsWith("text/plain"),
  "llms.txt remains plain text",
);
assert(
  llms.body.includes("https://wedges.dev/api/mcp") && llms.body.includes("start_wedges"),
  "llms.txt still describes the public MCP surface",
);
assert(llms.body.includes("https://wedges.dev/review"), "llms.txt exposes the direct browser workflow");

console.log("\nAll search-discovery checks passed.");
