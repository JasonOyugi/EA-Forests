import { rm } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const distRoot = path.join(projectRoot, "dist")
const releaseExcludedPaths = [
  "dashboard-dark.png",
  "dashboard-light.png",
  "dashboard.png",
  "Gatsby-Africa.png",
  "feature-1.mp4",
  "feature-2.mp4",
  "feature-3.mp4",
  "feature-4.mp4",
  "feature-5.mp4",
  "genetics.mp4",
  "hero-1.mp4",
  "hero-2.mp4",
  "hero-3.mp4",
  "hero-4.mp4",
  "mill.mp4",
  "profit.mp4",
  "vc.mp4",
  "video/genetics.mp4",
  "video/mill.mp4",
  "video/profit.mp4",
  "video/vc.mp4",
]

await Promise.all(
  releaseExcludedPaths.map((relativePath) =>
    rm(path.join(distRoot, relativePath), { force: true, recursive: true })
  )
)