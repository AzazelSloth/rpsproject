import assert from 'node:assert/strict';
import test from 'node:test';
import { SurveyTimingTracker, mergeTimingIntervals, type SurveyTimingPayload } from './survey-timing.ts';

function fixture(send: (payload: SurveyTimingPayload) => Promise<unknown> = async () => undefined) {
  let time = 1000;
  const cache = new Map<string, string>();
  const storage = {
    getItem: (key: string) => cache.get(key) ?? null,
    setItem: (key: string, value: string) => { cache.set(key, value); },
    removeItem: (key: string) => { cache.delete(key); },
  };
  const tracker = new SurveyTimingTracker('token', storage, send, true, () => time);
  return { tracker, storage, advance: (ms: number) => { time += ms; }, now: () => time };
}
function duration(tracker: SurveyTimingTracker) {
  return tracker.snapshot()?.intervals.reduce((total, item) => total + item.end - item.start, 0) ?? 0;
}

test('starts with the first answer and excludes time before it', () => {
  const { tracker, advance } = fixture();
  advance(10000); tracker.tick();
  assert.equal(tracker.snapshot(), undefined);
  advance(2000); tracker.start();
  assert.equal(duration(tracker), 0);
  advance(5000); tracker.tick();
  assert.equal(duration(tracker), 5000);
});

test('pauses when hidden and resumes when visible without counting the gap', () => {
  const { tracker, advance } = fixture();
  tracker.start(); advance(5000); tracker.setVisible(false);
  advance(60000); tracker.setVisible(true);
  advance(3000); tracker.tick();
  assert.equal(duration(tracker), 8000);
});

test('stops after two minutes of inactivity and resumes on interaction', () => {
  const { tracker, advance } = fixture();
  tracker.start();
  for (let i = 0; i < 30; i++) { advance(5000); tracker.tick(); }
  assert.equal(duration(tracker), 120000);
  tracker.activity(); advance(3000); tracker.tick();
  assert.equal(duration(tracker), 123000);
});

test('does not count a suspended browser interval', () => {
  const { tracker, advance } = fixture();
  tracker.start(); advance(5000); tracker.tick();
  advance(3600000); tracker.tick();
  assert.equal(duration(tracker), 5000);
});

test('retains offline timing across closing and reopening', async () => {
  const { tracker, storage, advance, now } = fixture(async () => { throw Error('offline'); });
  tracker.start(); advance(5000); tracker.tick();
  await tracker.flush(); tracker.setVisible(false);
  advance(60000);
  const reopened = new SurveyTimingTracker('token', storage, async () => undefined, true, now);
  reopened.start(); advance(3000); reopened.tick();
  assert.equal(duration(reopened), 8000);
});

test('acknowledgment retains time accrued during an in-flight request', async () => {
  let release!: () => void;
  const { tracker, advance } = fixture(() => new Promise<void>((resolve) => { release = resolve; }));
  tracker.start(); advance(5000); tracker.tick();
  const saving = tracker.flush();
  advance(5000); tracker.tick();
  release(); await saving;
  assert.equal(duration(tracker), 5000);
});

test('final validation clears pending timing and stops subsequent ticks', () => {
  const { tracker, storage, advance } = fixture();
  tracker.start(); advance(5000); tracker.tick();
  tracker.finish(); advance(5000); tracker.tick();
  assert.equal(storage.getItem('token'), null);
  assert.equal(duration(tracker), 0);
});

test('overlapping tabs are merged instead of double counted', () => {
  assert.deepEqual(mergeTimingIntervals([{ start: 0, end: 5000 }, { start: 2000, end: 8000 }]), [{ start: 0, end: 8000 }]);
});
