import { z } from "zod"

const locationSchema = z.object({
  country: z.string().nullable(),
  region: z.string().nullable(),
  district: z.string().nullable(),
  town: z.string().nullable(),
  address: z.string().nullable().optional(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  sourceId: z.string().nullable(),
  currentness: z.string().nullable(),
})

const offeringSchema = z.object({
  kind: z.string(),
  fields: z.record(z.string(), z.unknown()),
})

const sourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().nullable(),
  sourceType: z.string().nullable().optional(),
  publisher: z.string().nullable().optional(),
  date: z.string().nullable(),
  evidenceClass: z.string().nullable(),
})

const imagesSchema = z.object({
  imageUrl: z.string().nullable(),
  logoUrl: z.string().nullable(),
  imageSourceUrl: z.string().nullable(),
  imageAlt: z.string().nullable(),
  imageStatus: z.enum(["placeholder", "verified", "unverified"]),
})

export const actorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  aliases: z.string().nullable().optional(),
  country: z.string().min(1),
  countryCode: z.string().nullable().optional(),
  regionId: z.string().nullable(),
  regionName: z.string().nullable(),
  regionState: z.string().nullable(),
  districtCounty: z.string().nullable(),
  townSite: z.string().nullable(),
  actorType: z.string().nullable(),
  primaryRole: z.string().nullable(),
  modes: z.array(z.enum(["seeds", "seedlings", "silviculture", "harvest_haulage", "wood"])),
  roles: z.array(z.string()),
  species: z.string().nullable(),
  seedlingCapacityPerYear: z.string().nullable(),
  seedlingCertification: z.string().nullable(),
  silvicultureServices: z.string().nullable(),
  harvestHaulageServices: z.string().nullable(),
  processorProducts: z.string().nullable(),
  rawMaterialSpecies: z.string().nullable(),
  logSpecs: z.string().nullable(),
  annualCapacityM3: z.number().nullable(),
  annualRequirementM3: z.number().nullable(),
  currentSupplyM3: z.number().nullable(),
  utilisationPct: z.number().nullable(),
  sourcingRadiusKm: z.number().nullable(),
  certifications: z.string().nullable(),
  website: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  contactPerson: z.string().nullable(),
  currentness: z.string().nullable(),
  evidenceClass: z.enum(["A", "B", "C", "D"]).nullable(),
  catalogStatus: z.string().nullable(),
  sourceCount: z.number(),
  bestSourceId: z.string().nullable(),
  lastVerifiedDate: z.string().nullable(),
  summary: z.string().nullable(),
  notes: z.string().nullable(),
  locations: z.array(locationSchema),
  offerings: z.array(offeringSchema),
  sources: z.array(sourceSchema),
  providerIds: z.array(z.string()),
  images: imagesSchema,
  issues: z.array(z.string()),
})

export const marketAtlasFileSchema = z.object({
  version: z.number(),
  generatedAt: z.string(),
  sourceHash: z.string(),
  actors: z.array(actorSchema),
})
