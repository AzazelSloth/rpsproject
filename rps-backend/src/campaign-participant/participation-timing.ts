import { BadRequestException } from '@nestjs/common';
import { CampaignParticipant } from './campaign-participant.entity';
import { SaveSurveyTimingDto } from './dto/campaign-participant.dto';

// Union intervals makes retries and overlapping tabs idempotent.
export function applyParticipationTiming(
  participant: CampaignParticipant,
  payload: SaveSurveyTimingDto,
  now = Date.now(),
) {
  const lower = participant.created_at?.getTime() ?? 0;
  const upper = Math.min(now, participant.completed_at?.getTime() ?? now);
  const startedAt = Math.max(lower, Math.min(payload.started_at, upper));
  const intervals = payload.intervals
    .map(({ start, end }) => {
      if (end < start || start < payload.started_at) {
        throw new BadRequestException('Invalid timing interval');
      }
      return { start: Math.max(start, lower), end: Math.min(end, upper) };
    })
    .filter(({ start, end }) => end > start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const interval of [
    ...(participant.timing_intervals ?? []),
    ...intervals,
  ].sort((a, b) => a.start - b.start)) {
    const previous = merged[merged.length - 1];
    if (previous && interval.start <= previous.end)
      previous.end = Math.max(previous.end, interval.end);
    else merged.push({ ...interval });
  }
  participant.timing_intervals = merged;
  participant.timing_started_at = new Date(
    Math.min(participant.timing_started_at?.getTime() ?? startedAt, startedAt),
  );
}
