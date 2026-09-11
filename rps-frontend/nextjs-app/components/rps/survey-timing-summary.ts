type ParticipationTiming = {
  started_at: string | null;
  completed_at: string | null;
  active_seconds: number | null;
};

export function summarizeSurveyTiming(rows: readonly ParticipationTiming[]) {
  let totalSeconds = 0;
  let count = 0;
  for (const row of rows) {
    // Use the recorded active duration, never elapsed calendar time or a
    // replacement zero for historical questionnaires without timing data.
    if (!row.started_at || !row.completed_at || row.active_seconds === null ||
      !Number.isFinite(row.active_seconds) || row.active_seconds < 0) continue;
    totalSeconds += row.active_seconds;
    count += 1;
  }
  return {
    count,
    averageSeconds: count === 0 ? null : Math.round(totalSeconds / count),
  };
}
