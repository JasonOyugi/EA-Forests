#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { createReadStream, existsSync } from "node:fs"
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import assert from "node:assert/strict"
import readline from "node:readline"

const countryConfigs = [
  {
    country: "Kenya",
    country_code: "KEN",
    zip: "SSMT_Kenya.zip",
    layer: "KCFP_SSMT_Kenya",
    supplementalSources: [
      {
        zip: "Mvolkensii.zip",
        layer: "Site_Suitability",
        sourceLayer: "Mvolkensii_Site_Suitability",
        speciesName: "M_volkensii",
        suitabilityField: "M_volkensi",
        selectFields: [
          "M_volkensi",
          "Soil_Suit",
          "MAZ",
          "MAZ_class",
          "MAZ_Soil",
          "ForestSuit",
          "AEZ_SPECIE",
          "Area_ha",
        ],
      },
    ],
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
  "Possibly suitable": { rank: 3.5, color: "#ca8a04" },
  Unknown: { rank: 99, color: "#64748b" },
}

const wgs84TargetSrs = "+proj=longlat +datum=WGS84 +no_defs"

function parseArgs(argv) {
  const args = {
    inputDir: path.resolve(process.cwd(), ".."),
    outputDir: path.resolve(process.cwd(), "public/data/basic-ssmt"),
    simplify: "0.001",
    country: null,
    keepTemp: false,
    selfTest: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === "--input-dir") args.inputDir = path.resolve(argv[++index])
    else if (arg === "--output-dir") args.outputDir = path.resolve(argv[++index])
    else if (arg === "--simplify") args.simplify = argv[++index]
    else if (arg === "--country") args.country = argv[++index]
    else if (arg === "--keep-temp") args.keepTemp = true
    else if (arg === "--self-test") args.selfTest = true
    else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

function selectCountryConfigs(country) {
  if (!country) return countryConfigs

  const normalized = country.trim().toLowerCase()
  const selected = countryConfigs.filter((config) => {
    return (
      config.country.toLowerCase() === normalized ||
      config.country_code.toLowerCase() === normalized ||
      config.country.toLowerCase().startsWith(normalized)
    )
  })

  if (selected.length === 0) {
    throw new Error(
      `Unknown country "${country}". Use one of: ${countryConfigs
        .map((config) => `${config.country_code} (${config.country})`)
        .join(", ")}.`
    )
  }

  return selected
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
    const powershellPath = path.join(
      process.env.SystemRoot || "C:\\Windows",
      "System32",
      "WindowsPowerShell",
      "v1.0",
      "powershell.exe"
    )
    run(existsSync(powershellPath) ? powershellPath : "powershell.exe", [
      "-NoProfile",
      "-Command",
      "& { param([string]$ZipPath, [string]$Destination) Expand-Archive -LiteralPath $ZipPath -DestinationPath $Destination -Force }",
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

const speciesIdentityAliases = {
  a_augustifolia: { genus: "Araucaria", species: "angustifolia" },
  a_cuninghamii: { genus: "Araucaria", species: "cunninghamii" },
  a_hunstenii: { genus: "Araucaria", species: "hunsteinii" },
  a_crassica: { genus: "Acacia", species: "crassicarpa" },
  a_crassicarpa: { genus: "Acacia", species: "crassicarpa" },
  a_mangium: { genus: "Acacia", species: "mangium" },
  a_mang_au: { genus: "Acacia", species: "mangium_auriculoformis" },
  a_mang_auriculof: { genus: "Acacia", species: "mangium_auriculoformis" },
  a_mangium_auriculoformis: {
    genus: "Acacia",
    species: "mangium_auriculoformis",
  },
  a_mearnsii: { genus: "Acacia", species: "mearnsii" },
  a_quanzensis: { genus: "Afzelia", species: "quanzensis" },
  c_citrio_citrio: { genus: "Corymbia", species: "citriodora_citriodora" },
  c_citrio_varieg: { genus: "Corymbia", species: "citriodora_variegata" },
  c_cit_cit: { genus: "Corymbia", species: "citriodora_citriodora" },
  c_cit_var: { genus: "Corymbia", species: "citriodora_variegata" },
  c_citriodora_citriodora: {
    genus: "Corymbia",
    species: "citriodora_citriodora",
  },
  c_citriodora_variegata: {
    genus: "Corymbia",
    species: "citriodora_variegata",
  },
  c_cunninghamiana: { genus: "Casuarina", species: "cunninghamiana" },
  c_equiseti: { genus: "Casuarina", species: "equisetifolia" },
  c_equisetifolia: { genus: "Casuarina", species: "equisetifolia" },
  c_henryi: { genus: "Corymbia", species: "henryi" },
  c_henryi_torreliana: { genus: "Corymbia", species: "henryi_torreliana" },
  c_junghun: { genus: "Casuarina", species: "junghunhiana" },
  c_junghunhiana: { genus: "Casuarina", species: "junghunhiana" },
  c_lusitan: { genus: "Cupressus", species: "lusitanica" },
  c_lusitanica: { genus: "Cupressus", species: "lusitanica" },
  c_maculata: { genus: "Corymbia", species: "maculata" },
  c_odorata: { genus: "Cedrella", species: "odorata" },
  c_oligodon: { genus: "Casuarina", species: "oligodon" },
  c_torrel_henryi: { genus: "Corymbia", species: "torreliana_henryi" },
  c_torreliana: { genus: "Corymbia", species: "torreliana" },
  g_arborea: { genus: "Gmelina", species: "arborea" },
  g_robusta: { genus: "Grevillea", species: "robusta" },
  k_anthotheca: { genus: "Khaya", species: "anthotheca" },
  m_eminii: { genus: "Maesopsis", species: "eminii" },
  m_excelsa: { genus: "Milicia", species: "excelsa" },
  m_volkensi: { genus: "Melia", species: "volkensii" },
  m_volkensii: { genus: "Melia", species: "volkensii" },
  t_grandis: { genus: "Tectona", species: "grandis" },
}

const genusAliases = {
  E: "Eucalyptus",
  P: "Pinus",
  Grevillia: "Grevillea",
}

function deriveSpecies(speciesName) {
  const raw = String(speciesName ?? "").trim()
  if (!raw) return { genus: "Unknown/Other", species: "", speciesName: "" }

  const alias = speciesIdentityAliases[raw.toLowerCase()]
  if (alias) {
    return {
      ...alias,
      speciesName: `${alias.genus}_${alias.species}`,
    }
  }

  const [prefix = "", ...rest] = raw.split(/[_\s]+/).filter(Boolean)
  const cleanedPrefix = prefix.replace(/\.$/, "")
  const genus = genusAliases[cleanedPrefix] ?? cleanedPrefix
  const species = rest.join("_")

  return {
    genus: genus || "Unknown/Other",
    species,
    speciesName: species ? `${genus}_${species}` : raw,
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
  const { genus, species, speciesName: normalizedSpeciesName } =
    deriveSpecies(speciesName)
  const suitabilityName = normalizeSuitabilityName(
    firstValue(properties, ["suitability_name"])
  )

  return {
    type: "Feature",
    geometry: feature.geometry,
    properties: {
      country: String(firstValue(properties, ["country"]) ?? config.country),
      country_code: String(firstValue(properties, ["code"]) ?? config.country_code),
      species_name: normalizedSpeciesName || speciesName,
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

async function readExistingMetadata(outputDir) {
  try {
    const metadataPath = path.join(outputDir, "metadata.json")
    const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"))
    return metadata.generated ? metadata : null
  } catch {
    return null
  }
}

async function convertCountry(config, args, tempRoot) {
  const zipPath = path.join(args.inputDir, config.zip)
  if (!existsSync(zipPath)) {
    throw new Error(`Missing ${zipPath}`)
  }

  const extractDir = path.join(tempRoot, config.country_code)
  const rawGeoJsonSeq = path.join(tempRoot, `${config.country_code}.raw.geojsonl`)

  console.log(`Extracting ${config.zip}`)
  await extractZip(zipPath, extractDir)

  const gdbPath = await findFirstGdb(extractDir)
  if (!gdbPath) {
    throw new Error(`No .gdb directory found in ${config.zip}`)
  }

  console.log(`Converting ${config.layer} to EPSG:4326 GeoJSON`)
  run("ogr2ogr", [
    "-f",
    "GeoJSONSeq",
    "-t_srs",
    wgs84TargetSrs,
    "-lco",
    "RS=NO",
    "-explodecollections",
    "-simplify",
    args.simplify,
    rawGeoJsonSeq,
    gdbPath,
    config.layer,
  ])

  console.log(`Parsing ${rawGeoJsonSeq}`)
  const features = []
  let parsedFeatureCount = 0
  const lines = readline.createInterface({
    input: createReadStream(rawGeoJsonSeq, { encoding: "utf8" }),
    crlfDelay: Infinity,
  })

  for await (const line of lines) {
    const featureJson = line.replace(/^\u001e/, "").trim()
    if (!featureJson) continue
    features.push(normalizeFeature(JSON.parse(featureJson), config))
    parsedFeatureCount += 1
    if (parsedFeatureCount % 10000 === 0) {
      console.log(`Parsed ${parsedFeatureCount} ${config.country} features`)
    }
  }

  return features
}

function zipToVsiPath(zipPath) {
  return `/vsizip/${zipPath.replace(/\\/g, "/")}`
}

async function convertSupplementalSource(config, source, args, tempRoot) {
  const zipPath = path.join(args.inputDir, source.zip)
  if (!existsSync(zipPath)) {
    console.warn(`Skipping missing supplemental source ${zipPath}`)
    return []
  }

  const rawGeoJsonSeq = path.join(
    tempRoot,
    `${config.country_code}.${slug(source.speciesName)}.geojsonl`
  )

  console.log(`Converting supplemental ${source.zip}:${source.layer}`)
  run("ogr2ogr", [
    "-f",
    "GeoJSONSeq",
    "-lco",
    "RS=NO",
    "-explodecollections",
    "-simplify",
    args.simplify,
    "-select",
    source.selectFields.join(","),
    rawGeoJsonSeq,
    zipToVsiPath(zipPath),
    source.layer,
  ])

  const features = []
  const lines = readline.createInterface({
    input: createReadStream(rawGeoJsonSeq, { encoding: "utf8" }),
    crlfDelay: Infinity,
  })

  for await (const line of lines) {
    const featureJson = line.replace(/^\u001e/, "").trim()
    if (!featureJson) continue

    const feature = JSON.parse(featureJson)
    const properties = feature.properties ?? {}
    const suitabilityName = firstValue(properties, [source.suitabilityField])
    if (!suitabilityName) continue

    features.push(
      normalizeFeature(
        {
          type: "Feature",
          geometry: feature.geometry,
          properties: {
            country: config.country,
            code: config.country_code,
            species_name: source.speciesName,
            suitability_name: suitabilityName,
            soil_suitability: firstValue(properties, ["Soil_Suit"]),
            soil_description: firstValue(properties, ["MAZ_Soil"]),
            site_class: firstValue(properties, ["ForestSuit"]),
            maz: firstValue(properties, ["MAZ"]),
            maz_zone: firstValue(properties, ["MAZ_class", "AEZ_SPECIE"]),
          },
        },
        { ...config, layer: source.sourceLayer }
      )
    )
  }

  return features
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
    speciesName: "Eucalyptus_grandis_uroph",
  })
  assert.deepEqual(deriveSpecies("P_caribaea"), {
    genus: "Pinus",
    species: "caribaea",
    speciesName: "Pinus_caribaea",
  })
  assert.deepEqual(deriveSpecies("A_crassicarpa"), {
    genus: "Acacia",
    species: "crassicarpa",
    speciesName: "Acacia_crassicarpa",
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

  const selectedConfigs = selectCountryConfigs(args.country)
  if (!commandExists("ogr2ogr")) {
    throw new Error(
      "ogr2ogr was not found. Install GDAL with FileGDB/OpenFileGDB support before running this script."
    )
  }

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "basic-ssmt-"))
  const chunksDir = path.join(args.outputDir, "chunks")

  try {
    const features = []
    for (const config of selectedConfigs) {
      const countryFeatures = await convertCountry(config, args, tempRoot)
      for (const feature of countryFeatures) {
        features.push(feature)
      }

      for (const source of config.supplementalSources ?? []) {
        const supplementalFeatures = await convertSupplementalSource(
          config,
          source,
          args,
          tempRoot
        )
        for (const feature of supplementalFeatures) {
          features.push(feature)
        }
      }
    }

    const selectedCountryCodes = new Set(
      selectedConfigs.map((config) => config.country_code)
    )
    const replacingAllCountries = selectedConfigs.length === countryConfigs.length

    if (replacingAllCountries) {
      await fs.rm(chunksDir, { recursive: true, force: true })
    } else {
      for (const countryCode of selectedCountryCodes) {
        await fs.rm(path.join(chunksDir, slug(countryCode)), {
          recursive: true,
          force: true,
        })
      }
    }
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

    const existingMetadata = replacingAllCountries
      ? null
      : await readExistingMetadata(args.outputDir)
    const preservedChunkMetadata = (existingMetadata?.chunks ?? []).filter(
      (chunk) => !selectedCountryCodes.has(chunk.country_code)
    )
    const allChunkMetadata = [...preservedChunkMetadata, ...chunkMetadata]
    const generatedCountryCodes = new Set(
      allChunkMetadata.map((chunk) => chunk.country_code)
    )

    const species = Array.from(
      new Map(
        allChunkMetadata.map((chunk) => {
          const { genus, species } = deriveSpecies(chunk.species_name)
          return [
            chunk.species_name,
            {
              species_name: chunk.species_name,
              genus,
              species,
            },
          ]
        })
      ).values()
    ).sort((left, right) => left.species_name.localeCompare(right.species_name))

    const suitabilityNames = Array.from(
      new Set(allChunkMetadata.map((chunk) => chunk.suitability_name))
    )

    await writeJson(path.join(args.outputDir, "metadata.json"), {
      schema_version: 1,
      generated_at: new Date().toISOString(),
      generated: true,
      source_layers: Object.fromEntries(
        countryConfigs
          .filter((config) => generatedCountryCodes.has(config.country_code))
          .map((config) => [
            config.country_code,
            [config.layer, ...(config.supplementalSources ?? []).map((source) => source.sourceLayer)].join(
              " + "
            ),
          ])
      ),
      countries: countryConfigs
        .filter((config) => generatedCountryCodes.has(config.country_code))
        .map((config) => ({
          code: config.country_code,
          name: config.country,
        })),
      genera: Array.from(new Set(allChunkMetadata.map((chunk) => chunk.genus))).sort(),
      species,
      suitability: suitabilityNames
        .map((name) => ({
          name,
          rank: suitabilityPalette[name]?.rank ?? 99,
          color: suitabilityPalette[name]?.color ?? suitabilityPalette.Unknown.color,
        }))
        .sort((left, right) => left.rank - right.rank || left.name.localeCompare(right.name)),
      chunks: allChunkMetadata.sort((left, right) =>
        left.href.localeCompare(right.href)
      ),
      notes: [
        `Generated from ${Array.from(generatedCountryCodes)
          .map((countryCode) => {
            const config = countryConfigs.find(
              (item) => item.country_code === countryCode
            )
            if (!config) return null
            return [config.zip, ...(config.supplementalSources ?? []).map((source) => source.zip)].join(
              ", "
            )
          })
          .filter(Boolean)
          .join(", ")}.`,
        "Dominant Limitation datasets are intentionally excluded from this Basic SSMT layer.",
        `Geometry simplified with ogr2ogr -simplify ${args.simplify} after reprojection to EPSG:4326.`,
      ],
    })

    console.log(
      `Wrote ${chunkMetadata.length} ${args.country ? "new " : ""}chunks for ${features.length} features`
    )
  } finally {
    if (!args.keepTemp) {
      await fs.rm(tempRoot, { recursive: true, force: true })
    } else {
      console.log(`Kept temporary files at ${tempRoot}`)
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error)
  process.exit(1)
})
