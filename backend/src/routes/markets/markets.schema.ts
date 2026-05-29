import z from "zod";


export const symbolParamSchema = z.object({
  symbol: z.string()
})
