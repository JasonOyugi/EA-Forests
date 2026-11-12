#!/usr/bin/env node
// Reads automation/sources.json, fetches every feed and page, and writes the recent,
// sector-relevant items the site does not already cite. No dependencies: Node 20+.
//
//   node automation/site-steward/fetch-sources.mjs \
//     --site <repo root to check for existing citations> \
//     --state <json file remembered between runs> \
//     --out <report json>

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const args = parseArgs(process.argv.slice(2))
const config = JSON.parse(readFileSync(args.sources ?? join(here, "..", "sources.json"), "utf8"))
const siteRoot = resolve(args.site ?? join(here, "..", ".."))
const statePath = args.state
const outPath = args.out ?? "sources-report.json"
const lookbackDays = Number(args.lookback ?? config.lookbackDays ?? 21)
const now = Date.now()
const cutoff = now - lookbackDays * 86_400_000
const UA = "Mozilla/5.0 (compatible; EAForestsSectorScout/1.0; +https://eaforests.com)"

const keywords = config.keywords.map((k) => k.toLowerCase())
const geographies = config.geographies.map((g) => g.toLowerCase())
const citedText = collectCitedText(siteRoot)
const previous = statePath && existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : { pages: {} }
const nextState = { updatedAt: new Date(now).toISOString(), pages: {} }

const sourceResults = []
const items = []

for (const source of config.sources) {
  const result = { id: source.id, name: source.name, type: source.type, url: source.url, ok: false, fetched: 0, kept: 0 }
  try {
    const body = await fetchText(source.url)
    const raw = source.type === "rss" ? parseFeed(body) : parsePage(body, source)
    result.ok = true
    result.fetched = raw.length

    if (source.type === "page") {
      const seen = new Set(previous.pages?.[source.id] ?? [])
      nextState.pages[source.id] = raw.map((i) => i.link)
      // First run for a page: record a baseline and report nothing, otherwise every nav link looks new.
      result.baseline = seen.size === 0
      for (const item of raw) item.isNew = !result.baseline && !seen.has(item.link)
    }

    for (const item of raw) {
      const kept = keep(item, source)
      if (!kept) continue
      items.push(kept)
      result.kept += 1
    }
  } catch (error) {
    result.error = String(error?.message ?? error)
    if (previous.pages?.[source.id]) nextState.pages[source.id] = previous.pages[source.id]
  }
  sourceResults.push(result)
}

// Same story from several feeds: keep the first copy, list the others.
const byKey = new Map()
for (const item of items.sort((a, b) => b.score - a.score)) {
  const key = normaliseTitle(item.title)
  if (byKey.has(key)) byKey.get(key).alsoIn.push(item.sourceId)
  else byKey.set(key, { ...item, alsoIn: [] })
}
const finalItems = [...byKey.values()].sort((a, b) => b.score - a.score || (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))

const report = {
  generatedAt: new Date(now).toISOString(),
  lookbackDays,
  sources: sourceResults,
  itemCount: finalItems.length,
  items: finalItems,
}
mkdirSync(dirname(resolve(outPath)), { recursive: true })
writeFileSync(outPath, JSON.stringify(report, null, 2))
if (statePath) {
  mkdirSync(dirname(resolve(statePath)), { recursive: true })
  writeFileSync(statePath, JSON.stringify(nextState, null, 2))
}

const failed = sourceResults.filter((s) => !s.ok)
console.log(`sources: ${sourceResults.length - failed.length}/${sourceResults.length} reachable, ${finalItems.length} candidate items -> ${outPath}`)
for (const s of failed) console.log(`  unreachable: ${s.id} (${s.error})`)

// ---------------------------------------------------------------------------

function keep(item, source) {
  if (!item.title || !item.link) return null
  if (source.type === "page" && !item.isNew) return null
  if (item.publishedAt && Date.parse(item.publishedAt) < cutoff) return null

  const text = `${item.title} ${item.summary ?? ""}`.toLowerCase()
  const keywordHits = keywords.filter((k) => text.includes(k))
  const geoHits = geographies.filter((g) => text.includes(g))
  if (source.requireGeography && geoHits.length === 0) return null
  if (keywordHits.length === 0 && source.type === "rss" && !source.official) return null
  if (alreadyCited(item)) return null

  const score = keywordHits.length * 2 + geoHits.length * 3 + (source.official ? 3 : 0) + (item.publishedAt ? 1 : 0)
  return {
    title: item.title,
    link: item.link,
    publisher: item.publisher ?? source.name,
    publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString().slice(0, 10) : null,
    summary: item.summary ? item.summary.slice(0, 400) : null,
    sourceId: source.id,
    official: Boolean(source.official),
    viaAggregator: Boolean(source.aggregator),
    topics: source.topics ?? [],
    keywordHits,
    geoHits,
    score,
  }
}

function alreadyCited(item) {
  if (!item.link.includes("news.google.com") && citedText.includes(stripUrl(item.link))) return true
  const title = normaliseTitle(item.title)
  return title.length > 30 && citedText.includes(title)
}

function collectCitedText(root) {
  // Everything the site already cites: hub cards, articles and market data.
  const dirs = ["vite-version/src/app/information", "vite-version/src/app/articles", "vite-version/src/app/landing/components"]
  let text = ""
  for (const dir of dirs) {
    const abs = join(root, dir)
    if (!existsSync(abs)) continue
    for (const file of walk(abs)) if (/\.(ts|tsx|json)$/.test(file)) text += readFileSync(file, "utf8").toLowerCase()
  }
  return text.replace(/https?:\/\/(www\.)?/g, "")
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* walk(p)
    else yield p
  }
}

async function fetchText(url, attempt = 1) {
  try {
    return await fetchOnce(url)
  } catch (error) {
    if (attempt >= 3 || /HTTP 4\d\d/.test(error.message)) throw error
    await new Promise((r) => setTimeout(r, 3_000 * attempt))
    return fetchText(url, attempt + 1)
  }
}

async function fetchOnce(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30_000)
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept: "application/rss+xml, application/xml, text/html;q=0.9, */*;q=0.8" }, signal: controller.signal, redirect: "follow" })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

function parseFeed(xml) {
  const blocks = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map((m) => m[0])
  return blocks.map((block) => {
    const link = tag(block, "link") || attr(block, "link", "href") || tag(block, "guid")
    const date = tag(block, "pubDate") || tag(block, "published") || tag(block, "updated") || tag(block, "dc:date")
    let title = tag(block, "title")
    let publisher = tag(block, "source") || null
    // Google News appends " - Publisher" to titles.
    if (publisher && title.endsWith(` - ${publisher}`)) title = title.slice(0, -publisher.length - 3)
    return {
      title,
      link,
      publisher,
      publishedAt: date && !Number.isNaN(Date.parse(date)) ? new Date(date).toISOString() : null,
      summary: clean(tag(block, "description") || tag(block, "summary") || tag(block, "content")).slice(0, 600),
    }
  })
}

function parsePage(html, source) {
  const base = new URL(source.url)
  const pattern = source.linkPattern ? new RegExp(source.linkPattern, "i") : null
  const links = new Map()
  for (const m of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = clean(m[2])
    if (text.length < 25 || text.length > 220) continue
    let url
    try {
      url = new URL(m[1], base)
    } catch {
      continue
    }
    if (url.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) continue
    if (pattern && !pattern.test(url.pathname)) continue
    links.set(url.href, { title: text, link: url.href, publisher: source.name, publishedAt: null, summary: null })
  }
  return [...links.values()]
}

function tag(block, name) {
  const m = block.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`, "i"))
  return m ? clean(m[1]) : ""
}

function attr(block, name, attribute) {
  const m = block.match(new RegExp(`<${name}\\b[^>]*${attribute}=["']([^"']+)["']`, "i"))
  return m ? m[1] : ""
}

function clean(s = "") {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#8217;|&rsquo;/g, "'")
    .replace(/&#8216;|&lsquo;/g, "'")
    .replace(/&#822[01];|&[lr]dquo;/g, '"')
    .replace(/&#8211;|&ndash;/g, "-")
    .replace(/&#8212;|&mdash;/g, "-")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
}

function stripUrl(u) {
  return u.toLowerCase().replace(/https?:\/\/(www\.)?/, "").replace(/[?#].*$/, "").replace(/\/$/, "")
}

function normaliseTitle(t) {
  return t.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim()
}

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) if (argv[i].startsWith("--")) out[argv[i].slice(2)] = argv[i + 1]?.startsWith("--") ? true : argv[++i]
  return out
}
