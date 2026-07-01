export function extractPostImageMonthYear(value: string | Date | null | undefined): {
  month: number | null;
  year: number | null;
} {
  if (!value) {
    return { month: null, year: null };
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { month: null, year: null };
  }

  return {
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  };
}

export function formatPostImageCuriosityDate(value: string | Date | null | undefined): string {
  const { month, year } = extractPostImageMonthYear(value);

  if (!month || !year) {
    return "❤️ / -- / ----";
  }

  return `❤️ / ${month} / ${year}`;
}
