export interface AdoptionChartPoint {
  month: string;
  adoptions: number;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Bucket a list of adoption records (each with a created_at / timestamp)
 *  into the most recent `count` months. Returns zero-filled buckets so the
 *  UI always reflects live data instead of placeholders. */
export function buildMonthlyAdoptionHistory(
  records: unknown[],
  count = 6
): AdoptionChartPoint[] {
  const byMonth = new Map<string, number>();
  records.forEach((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const rawDate = r.created_at ?? r.timestamp ?? r.adoption_date ?? r.date;
    const d = new Date(rawDate as string | number | Date);
    if (isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    byMonth.set(key, (byMonth.get(key) || 0) + 1);
  });

  const now = new Date();
  const points: AdoptionChartPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    points.push({
      month: MONTHS[d.getMonth()],
      adoptions: byMonth.get(key) || 0,
    });
  }
  return points;
}