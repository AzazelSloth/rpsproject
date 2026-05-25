export function hasCampaignEnded(endDate: string | Date | null | undefined, now = new Date()) {
  const parsedEndDate = parseCampaignEndOfDay(endDate);

  if (!parsedEndDate) {
    return false;
  }

  return now.getTime() > parsedEndDate.getTime();
}

export function parseCampaignEndOfDay(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    const endDate = new Date(value);
    endDate.setHours(23, 59, 59, 999);
    return endDate;
  }

  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999);
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  parsedDate.setHours(23, 59, 59, 999);
  return parsedDate;
}
