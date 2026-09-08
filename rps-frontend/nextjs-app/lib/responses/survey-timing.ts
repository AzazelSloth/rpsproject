export type TimingInterval = { start: number; end: number };
export type SurveyTimingPayload = { started_at: number; intervals: TimingInterval[] };
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const TIMING_IDLE_MS = 120000;

export function mergeTimingIntervals(intervals: TimingInterval[]) {
  const result: TimingInterval[] = [];
  for (const interval of [...intervals].sort((a, b) => a.start - b.start)) {
    if (interval.end <= interval.start) continue;
    const last = result[result.length - 1];
    if (last && interval.start <= last.end) last.end = Math.max(last.end, interval.end);
    else result.push({ ...interval });
  }
  return result;
}

function subtractIntervals(intervals: TimingInterval[], acknowledged: TimingInterval[]) {
  let result = intervals;
  for (const ack of acknowledged) {
    result = result.flatMap((item) => {
      if (ack.end <= item.start || ack.start >= item.end) return [item];
      const parts: TimingInterval[] = [];
      if (item.start < ack.start) parts.push({ start: item.start, end: ack.start });
      if (item.end > ack.end) parts.push({ start: ack.end, end: item.end });
      return parts;
    });
  }
  return result;
}

export class SurveyTimingTracker {
  private startedAt: number | null = null;
  private lastTick: number;
  private lastActivity: number;
  private visible: boolean;
  private finished = false;
  private pending: TimingInterval[] = [];
  private inFlight: Promise<void> | null = null;
  private acknowledgedStart = false;
  private key: string;
  private storage: StorageLike | null;
  private send: (payload: SurveyTimingPayload) => Promise<unknown>;
  private now: () => number;

  constructor(key: string, storage: StorageLike | null,
    send: (payload: SurveyTimingPayload) => Promise<unknown>,
    visible: boolean, now: () => number = Date.now) {
    this.key = key;
    this.storage = storage;
    this.send = send;
    this.now = now;
    this.visible = visible;
    this.lastTick = this.lastActivity = now();
    const cached = this.read();
    if (cached) {
      this.startedAt = cached.started_at;
      this.pending = cached.intervals;
    }
  }

  private read(): SurveyTimingPayload | null {
    try {
      const raw = this.storage?.getItem(this.key);
      const value = raw ? JSON.parse(raw) as SurveyTimingPayload : null;
      if (value && Number.isSafeInteger(value.started_at) && Array.isArray(value.intervals) &&
        value.intervals.every((item) => Number.isSafeInteger(item.start) && Number.isSafeInteger(item.end) && item.end >= item.start)) return value;
    } catch { /* Storage can be unavailable. */ }
    return null;
  }

  start() {
    if (this.finished) return;
    if (this.startedAt === null) {
      this.startedAt = this.now();
      this.lastTick = this.lastActivity = this.startedAt;
      this.persist();
      return;
    }
    this.activity();
  }

  tick() {
    if (this.finished) return;
    const now = this.now();
    // A suspended browser/process must not count its entire sleeping interval.
    if (this.startedAt !== null && this.visible && now - this.lastTick <= 15000) {
      const end = Math.min(now, this.lastActivity + TIMING_IDLE_MS);
      if (end > this.lastTick) this.pending = mergeTimingIntervals([
        ...this.pending, { start: this.lastTick, end },
      ]);
    }
    this.lastTick = now;
    this.persist();
  }

  activity() {
    this.tick();
    this.lastActivity = this.now();
  }

  setVisible(visible: boolean) {
    this.tick();
    this.visible = visible;
    this.lastTick = this.now();
    if (visible) this.lastActivity = this.lastTick;
  }

  private persist() {
    if (this.startedAt === null || this.finished) return;
    const cached = this.read();
    this.pending = mergeTimingIntervals([...this.pending, ...(cached?.intervals ?? [])]);
    this.startedAt = Math.min(this.startedAt, cached?.started_at ?? this.startedAt);
    try { this.storage?.setItem(this.key, JSON.stringify({ started_at: this.startedAt, intervals: this.pending })); } catch { /* Keep the in-memory copy. */ }
  }

  snapshot(): SurveyTimingPayload | undefined {
    this.tick();
    if (this.startedAt === null) return undefined;
    return { started_at: this.startedAt, intervals: this.pending.slice(0, 500).map((item) => ({ ...item })) };
  }

  flush(): Promise<void> {
    if (this.finished) return Promise.resolve();
    if (this.inFlight) return this.inFlight;
    const payload = this.snapshot();
    if (!payload || (this.acknowledgedStart && !payload.intervals.length)) return Promise.resolve();
    this.inFlight = this.send(payload).then(() => {
      if (this.finished) return;
      this.acknowledgedStart = true;
      const cached = this.read();
      this.pending = subtractIntervals(mergeTimingIntervals([
        ...this.pending, ...(cached?.intervals ?? []),
      ]), payload.intervals);
      try {
        this.storage?.setItem(this.key, JSON.stringify({ started_at: this.startedAt, intervals: this.pending }));
      } catch { /* Retries are idempotent on the server. */ }
    }).catch(() => { this.persist(); }).finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  finish() {
    this.finished = true;
    this.pending = [];
    try { this.storage?.removeItem(this.key); } catch { /* best effort */ }
  }
}
