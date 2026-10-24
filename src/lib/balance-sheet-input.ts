import { z } from "zod/v4";

const balanceSheetFiltersSchema = z.object({
  days: z.coerce.number().min(0).max(3650).default(30),
  postStatus: z.enum(["all", "posted", "unposted"]).default("all"),
});

export type BalanceSheetFilters = z.output<typeof balanceSheetFiltersSchema>;

export function parseBalanceSheetFilters(params: URLSearchParams) {
  return balanceSheetFiltersSchema.safeParse({
    days: params.get("days") || undefined,
    postStatus: params.get("postStatus") || undefined,
  });
}
