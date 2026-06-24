#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import assert from "node:assert/strict"

const countryConfigs = [
  {
    country: "Kenya",
    country_code: "KEN",
    zip: "SSMT_Kenya.zip",
    layer: "KCFP_SSMT_Kenya",
  },
  {
    country: "Tanzania",
    country_code: "TZA",
    zip: "SSMT_Tanzania.zip",
    layer: "FDT_SSMT_Tanzania",
  },
  {
    country: "Uganda",
    country_code: "UGA",
    zip: "SWIFT_SSMT_Uganda.zip",
    layer: "SWIFT_SSMT_Uganda",
  },
]

const suitabilityPalette = {
  "Very suitable": { rank: 1, color: "#166534" },
  "Moderately suitable": { rank: 2, color: "#65a30d" },
  "Marginally suitable": { rank: 3, color: "#d97706" },
  "Not suitable": { rank: 4, color: "#991b1b" },
  Unknown: { rank: 99, color: "#64748b" },
}

function parseArgs(argv) {
  const args = {
    inputDir: path.resolve(process.cwd(), ".."),
    outputDir: path.resolve(process.cwd(), "public/data/basic-ssmt"),
    simplify: "0.001",
    keepTemp: false,
    selfTest: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--input-dir") args.inputDir = path.resolve(argv[++index])
    else if (arg === "--output-dir") args.outputDir = path.resolve(argv[++index])
    else if (arg === "--simplify") args.simplify = argv[++index]
    else if (arg === "--keep-temp") args.keepTemp = true
    else if (arg === "--self-test") args.selfTest = true
    else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
    ...options,
  })

  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with ${result.status}`)
  }
}

function commandExists(command) {
  const result = spawnSync(command, ["--version"], {
    stdio: "ignore",
    shell: false,
  })
  return result.status === 0
}

async function findFirstGdb(root) {
  const entries = await fs.readdir(root, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name)
    if (entry.isDirectory() && entry.name.toLowerCase().endsWith(".gdb")) {
      return fullPath
    }
    if (entry.isDirectory()) {
      const nested = await findFirstGdb(fullPath)
      if (nested) return nested
    }
  }

  return null
}

async function extractZip(zipPath, destination) {
  await fs.mkdir(destination, { recursive: true })

  if (process.platform === "win32") {
    run("powershell.exe", [
      "-NoProfile",
      "-Command",
      "Expand-Archive -LiteralPath $args[0] -DestinationPath $args[1] -Force",
      zipPath,
      destination,
    ])
    return
  }

  if (commandExists("unzip")) {
    run("unzip", ["-q", "-o", zipPath, "-d", destination])
    return
  }

  throw new Error("No zip extractor found. Install unzip or run on Windows with PowerShell.")
}

function normalizeSuitabilityName(value) {
  const raw = String(value ?? "").trim()
  if (!raw) return "Unknown"
  const lower = raw.toLowerCase().replace(/[_-]+/g, " ")

  if (lower.includes("very")) return "Very suitable"
  if (lower.includes("moderate")) return "Moderately suitable"
  if (lower.includes("marginal")) return "Marginally suitable"
  if (lower.includes("not")) return "Not suitable"

  return raw
}

function getSuitabilityRank(value) {
  const name = normalizeSuitabilityName(value)
  return suitabilityPalette[name]?.rank ?? 99
}

function deriveSpecies(speciesName) {
  const raw = String(speciesName ?? "").trim()
  if (!raw) return { genus: "Unknown/Other", species: "" }

  const [prefix = "", ...rest] = raw.split(/[_\s]+/).filter(Boolean)
  const cleanedPrefix = prefix.replace(/\.$/, "")
  const lowerRest = rest.join("_").toLowerCase()
  const common = {
    E: "Eucalyptus",
    P: "Pinus",
  }

  if (cleanedPrefix === "A") {
    if (lowerRest.includes("araucaria")) {
      return { genus: "Araucaria", species: rest.join("_") }
    }
    if (lowerRest.includes("crassicarpa") || lowerRest.includes("mangium")) {
      return { genus: "Acacia", species: rest.join("_") }
    }
    return { genus: "A", species: rest.join("_") }
  }

  return {
    genus: (common[cleanedPrefix] ?? cleanedPrefix) || "Unknown/Other",
    species: rest.join("_"),
  }
}

function firstValue(properties, keys) {
  for (const key of keys) {
    const value = properties[key]
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value
    }
  }
  return null
}

function normalizeFeature(feature, config) {
  const properties = feature.properties ?? {}
  const speciesName = String(firstValue(properties, ["species_name"]) ?? "")
  const { genus, species } = deriveSpecies(speciesName)
  const suitabilityName = normalizeSuitabilityName(
    firstValue(properties, ["suitability_name"])
  )

  return {
    type: "Feature",
    geometry: feature.geometry,
    properties: {
      country: String(firstValue(properties, ["country"]) ?? config.country),
      country_code: String(firstValue(properties, ["code"]) ?? config.country_code),
      species_name: speciesName,
      genus,
      species,
      suitability_name: suitabilityName,
      suitability_rank: getSuitabilityRank(suitabilityName),
      soil_suitability: firstValue(properties, [
        "soil_suitability",
        "soil_suit",
        "soilsuit",
      ]),
      soil_type: firstValue(properties, ["soil_type", "soil_fao", "fao_soil"]),
      soil_description: firstValue(properties, ["soil_description"]),
      site_class: firstValue(properties, ["site_class"]),
      maz: firstValue(properties, ["maz"]),
      maz_zone: firstValue(properties, ["maz_zone"]),
      tz: firstValue(properties, ["tz", "tz_climate"]),
      frost_risk: firstValue(properties, ["frost_risk"]),
      source_layer: config.layer,
    },
  }
}

function slug(value) {
  return String(value || "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown"
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

async function convertCountry(config, args, tempRoot) {
  const zipPath = path.join(args.inputDir, config.zip)
  if (!existsSync(zipPath)) {
    throw new Error(`Missing ${zipPath}`)
  }

  const extractDir = path.join(tempRoot, config.country_code)
  const rawGeoJson = path.join(tempRoot, `${config.country_code}.raw.geojson`)

  console.log(`Extracting ${config.zip}`)
  await extractZip(zipPath, extractDir)

  const gdbPath = await findFirstGdb(extractDir)
  if (!gdbPath) {
    throw new Error(`No .gdb directory found in ${config.zip}`)
  }

  console.log(`Converting ${config.layer} to EPSG:4326 GeoJSON`)
  run("ogr2ogr", [
    "-f",
    "GeoJSON",
    "-t_srs",
    "EPSG:4326",
    "-lco",
    "RFC7946=YES",
    "-simplify",
    args.simplify,
    rawGeoJson,
    gdbPath,
    config.layer,
  ])

  const raw = JSON.parse(await fs.readFile(rawGeoJson, "utf8"))
  return raw.features.map((feature) => normalizeFeature(feature, config))
}

function buildChunkKey(feature) {
  const properties = feature.properties
  return [
    properties.country_code,
    properties.genus,
    properties.species_name || "Unknown",
    properties.suitability_name,
  ].join("|")
}

function runSelfTest() {
  assert.deepEqual(deriveSpecies("E_grandis_uroph"), {
    genus: "Eucalyptus",
    species: "grandis_uroph",
  })
  assert.deepEqual(deriveSpecies("P_caribaea"), {
    genus: "Pinus",
    species: "caribaea",
  })
  assert.deepEqual(deriveSpecies("A_crassicarpa"), {
    genus: "Acacia",
    species: "crassicarpa",
  })
  assert.equal(normalizeSuitabilityName("Very suitable"), "Very suitable")
  assert.equal(normalizeSuitabilityName("moderately_suitable"), "Moderately suitable")
  assert.equal(getSuitabilityRank("Marginally suitable"), 3)
  console.log("Basic SSMT preprocessing self-test passed")
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.selfTest) {
    runSelfTest()
    return
  }

  if (!commandExists("ogr2ogr")) {
    throw new Error(
      "ogr2ogr was not found. Install GDAL with FileGDB/OpenFileGDB support before running this script."
    )
  }

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "basic-ssmt-"))
  const chunksDir = path.join(args.outputDir, "chunks")

  try {
    const features = (
      await Promise.all(
        countryConfigs.map((config) => convertCountry(config, args, tempRoot))
      )
    ).flat()

    await fs.rm(chunksDir, { recursive: true, force: true })
    await fs.mkdir(chunksDir, { recursive: true })

    const chunks = new Map()
    for (const feature of features) {
      const key = buildChunkKey(feature)
      const current = chunks.get(key) ?? []
      current.push(feature)
      chunks.set(key, current)
    }

    const chunkMetadata = []
    for (const [key, chunkFeatures] of chunks) {
      const [countryCode, genus, speciesName, suitabilityName] = key.split("|")
      const filePath = path.join(
        chunksDir,
        slug(countryCode),
        slug(genus),
        `${slug(speciesName)}-${slug(suitabilityName)}.geojson`
      )
      const href = `/data/basic-ssmt/chunks/${slug(countryCode)}/${slug(genus)}/${path.basename(filePath)}`

      await writeJson(filePath, {
        type: "FeatureCollection",
        features: chunkFeatures,
      })
      chunkMetadata.push({
        country_code: countryCode,
        genus,
        species_name: speciesName,
        suitability_name: suitabilityName,
        href,
        feature_count: chunkFeatures.length,
      })
    }

    const species = Array.from(
      new Map(
        features.map((feature) => [
          feature.properties.species_name,
          {
            species_name: feature.properties.species_name,
            genus: feature.properties.genus,
            species: feature.properties.species,
          },
        ])
      ).values()
    ).sort((left, right) => left.species_name.localeCompare(right.species_name))

    const suitabilityNames = Array.from(
      new Set(features.map((feature) => feature.properties.suitability_name))
    )

    await writeJson(path.join(args.outputDir, "metadata.json"), {
      schema_version: 1,
      generated_at: new Date().toISOString(),
      generated: true,
      source_layers: Object.fromEntries(
        countryConfigs.map((config) => [config.country_code, config.layer])
      ),
      countries: countryConfigs.map((config) => ({
        code: config.country_code,
        name: config.country,
      })),
      genera: Array.from(new Set(features.map((feature) => feature.properties.genus))).sort(),
      species,
      suitability: suitabilityNames
        .map((name) => ({
          name,
          rank: suitabilityPalette[name]?.rank ?? 99,
          color: suitabilityPalette[name]?.color ?? suitabilityPalette.Unknown.color,
        }))
        .sort((left, right) => left.rank - right.rank || left.name.localeCompare(right.name)),
      chunks: chunkMetadata.sort((left, right) =>
        left.href.localeCompare(right.href)
      ),
      notes: [
        `Generated from ${countryConfigs.map((config) => config.zip).join(", ")}.`,
        "Dominant Limitation datasets are intentionally excluded from this Basic SSMT layer.",
        `Geometry simplified with ogr2ogr -simplify ${args.simplify} after reprojection to EPSG:4326.`,
      ],
    })

    console.log(`Wrote ${chunkMetadata.length} chunks for ${features.length} features`)
  } finally {
    if (!args.keepTemp) {
      await fs.rm(tempRoot, { recursive: true, force: true })
    } else {
      console.log(`Kept temporary files at ${tempRoot}`)
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
