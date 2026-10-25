export interface AddedTransactions {
  count: number;
  ids: number[];
  days: number;
}

export function addedTransactionsUrl(
  count: number,
  ids: number[],
  dates: string[],
  now = new Date(),
) {
  const earliest = Math.min(
    ...dates.map((date) => Date.parse(`${date}T00:00:00Z`)),
  );
  const days = Math.min(
    3650,
    Math.max(30, Math.ceil((now.getTime() - earliest) / 86400000) + 1),
  );
  const params = new URLSearchParams({
    added: String(count),
    newIds: ids.join(","),
    days: String(days),
  });
  return `/balance-sheet?${params}`;
}

export function parseAddedTransactions(
  params: Pick<URLSearchParams, "get">,
): AddedTransactions | null {
  const count = Number(params.get("added"));
  const rawIds = params.get("newIds") || "";
  const ids = rawIds ? rawIds.split(",").map(Number) : [];
  const days = Number(params.get("days") || 30);
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 500 ||
    ids.length > count ||
    ids.some((id) => !Number.isSafeInteger(id) || id < 1) ||
    new Set(ids).size !== ids.length ||
    !Number.isInteger(days) ||
    days < 30 ||
    days > 3650
  )
    return null;
  return { count, ids, days };
}
