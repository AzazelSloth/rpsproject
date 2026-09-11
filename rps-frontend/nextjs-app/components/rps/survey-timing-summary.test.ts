import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeSurveyTiming } from './survey-timing-summary.ts';

const completed = (active_seconds: number | null) => ({
  started_at: '2026-09-11T08:00:00Z',
  completed_at: '2026-09-11T10:00:00Z',
  active_seconds,
});

test('averages recorded active time per completed participation, not calendar time', () => {
  assert.deepEqual(summarizeSurveyTiming([completed(120), completed(240), completed(540)]), {
    count: 3, averageSeconds: 300,
  });
});

test('excludes unfinished participations and historical questionnaires without timing', () => {
  assert.deepEqual(summarizeSurveyTiming([
    completed(120),
    { ...completed(600), completed_at: null },
    { ...completed(0), started_at: null },
    completed(null),
    { started_at: null, completed_at: null, active_seconds: null },
  ]), { count: 1, averageSeconds: 120 });
});

test('no eligible participation means no average, not zero', () => {
  assert.deepEqual(summarizeSurveyTiming([]), { count: 0, averageSeconds: null });
  assert.deepEqual(summarizeSurveyTiming([completed(null)]), { count: 0, averageSeconds: null });
});

test('includes an explicitly recorded zero and rounds only the final average', () => {
  assert.deepEqual(summarizeSurveyTiming([completed(0), completed(61)]), {
    count: 2, averageSeconds: 31,
  });
});

test('excludes invalid durations', () => {
  assert.deepEqual(summarizeSurveyTiming([
    completed(-1), completed(NaN), completed(Infinity), completed(60),
  ]), { count: 1, averageSeconds: 60 });
});

test('does not mutate individual timing rows and recalculates from refreshed data', () => {
  const rows = Object.freeze([Object.freeze(completed(60))]);
  assert.deepEqual(summarizeSurveyTiming(rows), { count: 1, averageSeconds: 60 });
  assert.deepEqual(summarizeSurveyTiming([...rows, completed(120)]), {
    count: 2, averageSeconds: 90,
  });
  assert.equal(rows[0].active_seconds, 60);
});
