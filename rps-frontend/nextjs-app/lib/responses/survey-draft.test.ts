import assert from "node:assert/strict";
import test from "node:test";
import {
  SurveyDraftSession,
  fromBackendDraft,
  toBackendDraft,
  resumeSection,
  restoreDraftProgress,
  type SurveyDraft,
  type SaveDraftResult,
} from "./survey-draft.ts";

const blank = (): SurveyDraft => ({
  answers: {},
  currentSection: 0,
  started: false,
});
function storage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}
const accept = async (
  draft: ReturnType<typeof toBackendDraft>,
  revision: number,
): Promise<SaveDraftResult> => ({
  saved: true,
  completed: false,
  revision: revision + 1,
  draft,
});
const noop = () => {};

test("immediate close and offline failures retain even unfinished text locally", async () => {
  const cache = storage();
  const first = new SurveyDraftSession(
    "token",
    blank(),
    0,
    cache,
    async () => {
      throw Error("offline");
    },
    noop,
  );
  first.update({
    answers: { "1": " unfinished " },
    currentSection: 1,
    started: true,
  });
  assert.ok(cache.getItem("token"));
  assert.equal(await first.save(), false);
  assert.equal(first.dirty, true);
  const reopened = new SurveyDraftSession(
    "token",
    blank(),
    0,
    cache,
    accept,
    noop,
  );
  assert.deepEqual(reopened.draft, first.draft);
  assert.equal(await reopened.save(), true);
  assert.equal(reopened.dirty, false);
  assert.equal(reopened.draft.answers["1"], " unfinished ");
});

test("a synchronized stale browser cache does not overwrite another device", () => {
  const cache = storage();
  const old = { ...blank(), answers: { "1": "old" } };
  const first = new SurveyDraftSession("token", old, 1, cache, accept, noop);
  first.persist();
  const remote = {
    ...old,
    answers: { "1": "new", "2": "other device" },
    currentSection: 2,
  };
  const reopened = new SurveyDraftSession(
    "token",
    remote,
    2,
    cache,
    accept,
    noop,
  );
  assert.deepEqual(reopened.draft, remote);
  assert.equal(reopened.dirty, false);
});

test("offline local edits merge with independent remote edits, including cleared answers", () => {
  const cache = storage();
  const base = { ...blank(), answers: { "1": "old", "2": "erase" } };
  const first = new SurveyDraftSession("token", base, 1, cache, accept, noop);
  first.update({ ...base, answers: { "1": "local", "2": "" } });
  const remote = { ...base, answers: { ...base.answers, "3": "remote" } };
  const reopened = new SurveyDraftSession(
    "token",
    remote,
    2,
    cache,
    accept,
    noop,
  );
  assert.deepEqual(reopened.draft.answers, {
    "1": "local",
    "2": "",
    "3": "remote",
  });
});

test("edits during an in-flight save are sent after its acknowledgment", async () => {
  let release!: (value: SaveDraftResult) => void;
  const calls: number[] = [];
  const session = new SurveyDraftSession(
    "token",
    blank(),
    0,
    storage(),
    async (draft, revision) => {
      calls.push(revision);
      if (calls.length === 1)
        return new Promise((resolve) => {
          release = resolve;
        });
      return accept(draft, revision);
    },
    noop,
  );
  session.update({ ...blank(), answers: { "1": "first" } });
  const saving = session.save();
  const sent = session.draft;
  session.update({ ...sent, answers: { "1": "second" } });
  assert.equal(session.save(), saving);
  release(await accept(toBackendDraft(sent), 0));
  assert.equal(await saving, true);
  assert.deepEqual(calls, [0, 1]);
  assert.equal(session.base.answers["1"], "second");
});

test("revision conflicts merge unsent changes and retry with the latest revision", async () => {
  let calls = 0;
  const session = new SurveyDraftSession(
    "token",
    blank(),
    0,
    storage(),
    async (draft, revision) => {
      if (++calls === 1)
        return {
          saved: false,
          completed: false,
          revision: 4,
          draft: toBackendDraft({ ...blank(), answers: { "2": "remote" } }),
        };
      assert.equal(revision, 4);
      return accept(draft, revision);
    },
    noop,
  );
  session.update({ ...blank(), answers: { "1": "local" } });
  assert.equal(await session.save(), true);
  assert.deepEqual(session.draft.answers, { "1": "local", "2": "remote" });
});

test("completed participation clears its cache and cannot be saved again", async () => {
  const cache = storage();
  const session = new SurveyDraftSession(
    "token",
    blank(),
    0,
    cache,
    async () => ({ saved: false, completed: true, revision: 2, draft: null }),
    noop,
  );
  session.update({ ...blank(), answers: { "1": "local" } });
  assert.equal(await session.save(), false);
  assert.equal(cache.getItem("token"), null);
  session.update(blank());
  session.persist();
  assert.equal(cache.getItem("token"), null);
  assert.equal(session.dirty, false);
});

test("refusal remains distinct from an empty answer after a round trip", () => {
  const remote = {
    responses: [
      { question_id: 1, answer: null, response_state: "declined" as const },
      { question_id: 2, answer: "", response_state: "answered" as const },
    ],
    current_section: 1,
    started: true,
  };
  assert.deepEqual(toBackendDraft(fromBackendDraft(remote)), remote);
});

test("resume advances past completed sections and retains a partially answered page", () => {
  const draft = { ...blank(), answers: { "1": "4", "2": "yes", "3": "text" } };
  assert.equal(
    resumeSection(
      draft,
      [
        ["1", "2"],
        ["3", "4"],
      ],
      3,
    ),
    1,
  );
  assert.equal(
    resumeSection(
      { ...draft, answers: { ...draft.answers, "4": "5" } },
      [
        ["1", "2"],
        ["3", "4"],
      ],
      3,
    ),
    2,
  );
  assert.equal(resumeSection({ ...draft, currentSection: 50 }, [["1"]], 1), 0);
});

test("restoring an answered draft skips the introduction and opens the next section", () => {
  assert.deepEqual(
    restoreDraftProgress(
      {
        answers: { "1": "4", "2": "yes" },
        currentSection: 0,
        started: false,
      },
      [
        ["1", "2"],
        ["3"],
      ],
      2,
    ),
    {
      answers: { "1": "4", "2": "yes" },
      currentSection: 1,
      started: true,
    },
  );
});

test("restoring a partial page keeps the employee on that page", () => {
  assert.deepEqual(
    restoreDraftProgress(
      {
        answers: { "1": "4", "999": "obsolete" },
        currentSection: 0,
        started: false,
      },
      [
        ["1", "2"],
        ["3"],
      ],
      2,
    ),
    {
      answers: { "1": "4" },
      currentSection: 0,
      started: true,
    },
  );
});

test("reopening the updated questionnaire returns from conclusion to newly added questions", () => {
  const cache = storage();
  const oldDraft = {
    answers: { "1": "4", "2": "yes" },
    currentSection: 2,
    started: true,
  };
  const old = new SurveyDraftSession("token", oldDraft, 5, cache, accept, noop);
  old.persist();
  // The backend refreshed the questionnaire and reset the saved position.
  const reopened = new SurveyDraftSession(
    "token", { ...oldDraft, currentSection: 0 }, 6, cache, accept, noop,
  );
  const restored = restoreDraftProgress(reopened.draft, [["1"], ["2", "3"]], 3);
  assert.equal(restored.currentSection, 1);
  assert.deepEqual(restored.answers, oldDraft.answers);
  assert.equal(restored.started, true);
});

test("updated questions retain offline answers still present and remove obsolete cached answers", async () => {
  const cache = storage();
  const oldDraft = {
    answers: { "1": "saved", "9": "deleted question" },
    currentSection: 1, started: true,
  };
  const old = new SurveyDraftSession("token", oldDraft, 5, cache, accept, noop);
  old.update({ ...oldDraft, answers: { "1": "offline edit", "9": "offline obsolete" } });
  const reopened = new SurveyDraftSession(
    "token", { answers: { "1": "saved" }, currentSection: 0, started: true }, 6, cache, accept, noop,
  );
  reopened.update(restoreDraftProgress(reopened.draft, [["1", "2"]], 2));
  assert.deepEqual(reopened.draft.answers, { "1": "offline edit" });
  assert.equal(reopened.draft.currentSection, 0);
  assert.equal(await reopened.save(), true);
});

test("corrupt or unavailable storage does not prevent server saving", async () => {
  const cache = {
    getItem: () => "{bad",
    setItem: () => {
      throw Error("quota");
    },
    removeItem: noop,
  };
  const session = new SurveyDraftSession(
    "token",
    blank(),
    0,
    cache,
    accept,
    noop,
  );
  session.update({ ...blank(), answers: { "1": "test" } });
  assert.equal(await session.save(), true);
});

test("a delayed response from an unmounted page cannot overwrite the reopened cache", async () => {
  let release!: (value: SaveDraftResult) => void;
  const cache = storage();
  const old = new SurveyDraftSession(
    "token",
    blank(),
    0,
    cache,
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
    noop,
  );
  old.update({ ...blank(), answers: { "1": "old" } });
  const saving = old.save();
  old.dispose();
  const reopened = new SurveyDraftSession(
    "token",
    blank(),
    0,
    cache,
    accept,
    noop,
  );
  reopened.update({ ...blank(), answers: { "1": "new" } });
  const before = cache.getItem("token");
  release(await accept(toBackendDraft(old.draft), 0));
  await saving;
  assert.equal(cache.getItem("token"), before);
});
