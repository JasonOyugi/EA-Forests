#!/usr/bin/env node
// Crawls the live site in a real browser and records what a visitor would notice:
// broken pages, images that fail to load, console errors, mobile overflow and dead
// outbound links. Screenshots go to --shots for a person to compare between runs.
//
//   node automation/site-steward/check-site.mjs --url https://eaforests.com \
//     --playwright-from vite-version --out site-health.json --shots shots/ [--max-pages 30]

import { createRequire } from "node:module"
import { mkdirSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"

const args = parseArgs(process.argv.slice(2))
const baseUrl = new URL(args.url ?? "https://eaforests.com")
const maxPages = Number(args["max-pages"] ?? 30)
const outPath = args.out ?? "site-health.json"
const shotsDir = args.shots ? resolve(args.shots) : null
const require = createRequire(join(resolve(args["playwright-from"] ?? "vite-version"), "package.json"))
const { chromium } = require("playwright")

// Pages people land on most. The crawl adds whatever these link to, up to --max-pages.
const seeds = ["/", "/articles", "/models", "/shop", "/newsletter"]
const notFoundText = /page not found|404|doesn['’]t exist/i
const viewports = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } }

const browser = await chromium.launch()
const pages = []
const external = new Map()
const queue = [...seeds]
const visited = new Set()
if (shotsDir) mkdirSync(shotsDir, { recursive: true })

try {
  while (queue.length && visited.size < maxPages) {
    const path = queue.shift()
    if (visited.has(path)) continue
    visited.add(path)
    const result = await checkPage(path)
    pages.push(result)
    for (const link of result.links) {
      const url = new URL(link, baseUrl)
      if (url.origin === baseUrl.origin) {
        const p = url.pathname.replace(/\/$/, "") || "/"
        if (!visited.has(p) && !queue.includes(p) && !/\.(pdf|xlsx?|csv|zip|png|jpe?g|webp)$/i.test(p)) queue.push(p)
      } else if (/^https?:$/.test(url.protocol)) {
        const key = url.href.replace(/#.*$/, "")
        if (!external.has(key)) external.set(key, new Set())
        external.get(key).add(path)
      }
    }
  }
} finally {
  await browser.close()
}

const outbound = await checkOutbound([...external.entries()].slice(0, Number(args["max-links"] ?? 250)))

// One entry per distinct issue, listing every page it appears on.
const grouped = new Map()
const add = (severity, page, issue) => {
  const key = `${severity}|${issue}`
  if (!grouped.has(key)) grouped.set(key, { severity, issue, pages: [] })
  grouped.get(key).pages.push(...[].concat(page))
}
for (const p of pages) {
  if (p.error) add("high", p.path, `Page failed to load: ${p.error}`)
  if (p.notFound) add("high", p.path, "Linked page renders the not-found screen")
  for (const img of p.brokenImages) add("medium", p.path, `Image does not load: ${img}`)
  for (const e of p.consoleErrors.slice(0, 5)) add("low", p.path, `Console error: ${e}`)
  if (p.mobileOverflowPx > 2) add("medium", p.path, `Page scrolls sideways on a 390px phone by ${p.mobileOverflowPx}px`)
  if (p.loadMs > 8000) add("low", p.path, "Slow first load (over 8s to the load event)")
}
for (const link of outbound.filter((l) => l.verdict === "broken")) add("medium", link.foundOn, `Outbound link returns ${link.status}: ${link.url}`)
const rank = { high: 0, medium: 1, low: 2 }
const problems = [...grouped.values()].map((g) => ({ ...g, pages: [...new Set(g.pages)] })).sort((a, b) => rank[a.severity] - rank[b.severity])

const report = {
  checkedAt: new Date().toISOString(),
  site: baseUrl.origin,
  pagesChecked: pages.length,
  outboundChecked: outbound.length,
  problems,
  pages: pages.map(({ links, ...rest }) => ({ ...rest, linkCount: links.length })),
  outbound,
}
writeFileSync(outPath, JSON.stringify(report, null, 2))
console.log(`site: ${pages.length} pages, ${outbound.length} outbound links, ${problems.length} problems -> ${outPath}`)

// ---------------------------------------------------------------------------

async function checkPage(path) {
  const url = new URL(path, baseUrl).href
  const result = { path, consoleErrors: [], failedRequests: [], brokenImages: [], links: [], mobileOverflowPx: 0 }
  for (const [name, viewport] of Object.entries(viewports)) {
    const context = await browser.newContext({ viewport, userAgent: "Mozilla/5.0 (compatible; EAForestsSiteSteward/1.0)" })
    const page = await context.newPage()
    if (name === "desktop") {
      page.on("console", (m) => m.type() === "error" && result.consoleErrors.push(m.text().slice(0, 300)))
      page.on("pageerror", (e) => result.consoleErrors.push(String(e.message).slice(0, 300)))
      page.on("requestfailed", (r) => result.failedRequests.push(`${r.url().slice(0, 200)} (${r.failure()?.errorText})`))
      page.on("response", (r) => r.status() >= 400 && result.failedRequests.push(`${r.url().slice(0, 200)} (HTTP ${r.status()})`))
    }
    try {
      const started = Date.now()
      await page.goto(url, { waitUntil: "load", timeout: 45_000 })
      if (name === "desktop") result.loadMs = Date.now() - started
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {})
      // Bring lazy images into view so they load before we judge them.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) {
          window.scrollTo(0, y)
          await new Promise((r) => setTimeout(r, 120))
        }
        window.scrollTo(0, 0)
      })
      await page.waitForTimeout(1500)

      if (name === "desktop") {
        const info = await page.evaluate(() => ({
          title: document.title,
          h1: document.querySelector("h1")?.textContent?.trim().slice(0, 160) ?? null,
          text: document.body.innerText.slice(0, 2000),
          links: [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href")).filter((h) => h && !h.startsWith("mailto:") && !h.startsWith("tel:") && !h.startsWith("#")),
          broken: [...document.images].filter((i) => i.complete && i.naturalWidth === 0 && i.src && !i.src.startsWith("data:")).map((i) => i.currentSrc || i.src),
        }))
        result.title = info.title
        result.h1 = info.h1
        result.notFound = notFoundText.test(info.h1 ?? "") || (notFoundText.test(info.text) && info.text.length < 600)
        result.links = [...new Set(info.links)]
        result.brokenImages = [...new Set(info.broken)]
      } else {
        result.mobileOverflowPx = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      }
      if (shotsDir) {
        const file = `${path === "/" ? "home" : path.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-")}.${name}.png`
        await page.screenshot({ path: join(shotsDir, file), fullPage: false })
      }
    } catch (error) {
      result.error = String(error?.message ?? error).split("\n")[0]
    } finally {
      await context.close()
    }
  }
  result.failedRequests = [...new Set(result.failedRequests)].filter((r) => !/analytics|insights|speed-insights|_vercel/.test(r)).slice(0, 20)
  result.consoleErrors = [...new Set(result.consoleErrors)]
  return result
}

async function checkOutbound(entries) {
  const results = []
  let index = 0
  async function worker() {
    while (index < entries.length) {
      const [url, foundOn] = entries[index++]
      results.push({ url, foundOn: [...foundOn], ...(await probe(url)) })
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker))
  return results.sort((a, b) => a.url.localeCompare(b.url))
}

async function probe(url) {
  const headers = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36", accept: "text/html,*/*" }
  for (const method of ["HEAD", "GET"]) {
    try {
      const res = await fetch(url, { method, headers, redirect: "follow", signal: AbortSignal.timeout(20_000) })
      if (method === "HEAD" && [403, 405, 501].includes(res.status)) continue
      // 401/403/429 usually mean the site blocks bots, not that the page is gone.
      const verdict = res.ok ? "ok" : [404, 410].includes(res.status) || res.status >= 500 ? "broken" : "blocked"
      return { status: res.status, verdict }
    } catch (error) {
      if (method === "GET") return { status: String(error?.cause?.code ?? error?.name ?? "error"), verdict: "unreachable" }
    }
  }
  return { status: "unknown", verdict: "blocked" }
}

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 1) if (argv[i].startsWith("--")) out[argv[i].slice(2)] = argv[i + 1]?.startsWith("--") ? true : argv[++i]
  return out
}
