import { z } from "zod"

export const trendPointSchema = z.object({
  month: z.string(),
  target: z.number(),
  actual: z.number(),
})

export const schema = z.object({
  id: z.number(),
  header: z.string(),
  type: z.string(),
  status: z.string(),
  target: z.string(),
  limit: z.string(),
  reviewer: z.string(),
  grower: z.string().optional(),
  context: z.string().optional(),
  trend: z.array(trendPointSchema).optional(),
})

export type Task = z.infer<typeof schema>
