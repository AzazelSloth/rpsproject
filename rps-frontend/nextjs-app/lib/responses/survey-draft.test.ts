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
  const writes: string[] = [];
  return {
    writes,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      writes.push(value);
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
const choiceQuestions = ["1", "2", "3", "9"].map((id) => ({ id, type: "choice" as const }));

test("save time advances only after a server acknowledgment, never for local or unchanged drafts", async (t) => {
  let now = 1000;
  t.mock.method(Date, "now", () => now);
  let release!: (value: SaveDraftResult) => void;
  const session = new SurveyDraftSession(
    "token", blank(), 0, storage(),
    () => new Promise((resolve) => { release = resolve; }), noop, choiceQuestions,
  );

  assert.equal(session.lastSavedAt, null);
  await session.save();
  assert.equal(session.lastSavedAt, null);

  session.update({ ...blank(), answers: { "1": "first" } });
  assert.equal(session.lastSavedAt, null);
  const firstSave = session.save();
  assert.equal(session.state, "saving");
  assert.equal(session.lastSavedAt, null);
  now = 2000;
  release(await accept(toBackendDraft(session.draft), 0));
  await firstSave;
  assert.equal(session.state, "saved");
  assert.equal(session.lastSavedAt, 2000);

  now = 3000;
  await session.save();
  assert.equal(session.lastSavedAt, 2000);
  session.update({ ...blank(), answers: { "1": "second" } });
  const secondSave = session.save();
  assert.equal(session.lastSavedAt, 2000);
  now = 4000;
  release(await accept(toBackendDraft(session.draft), 1));
  await secondSave;
  assert.equal(session.lastSavedAt, 4000);
});

test("failed saves and revision conflicts preserve the last confirmation time until a successful retry", async (t) => {
  let now = 1000;
  t.mock.method(Date, "now", () => now);
  let mode = "accept";
  const session = new SurveyDraftSession(
    "token", blank(), 0, storage(),
    async (draft, revision) => {
      if (mode === "offline") throw new Error("offline");
      if (mode === "conflict") return {
        saved: false, completed: false, revision: revision + 1, draft: null,
      };
      return accept(draft, revision);
    }, noop, choiceQuestions,
  );
  session.update({ ...blank(), answers: { "1": "first" } });
  await session.save();
  assert.equal(session.lastSavedAt, 1000);

  now = 2000;
  session.update({ ...blank(), answers: { "1": "second" } });
  for (mode of ["offline", "conflict"]) {
    assert.equal(await session.save(), false);
    assert.equal(session.state, "error");
    assert.equal(session.lastSavedAt, 1000);
  }

  now = 3000;
  mode = "accept";
  assert.equal(await session.save(), true);
  assert.equal(session.state, "saved");
  assert.equal(session.lastSavedAt, 3000);
});

test("offline navigation keeps free text in memory but reloading restores only other answers", async () => {
  const cache = storage();
  const questions = [
    { id: "1", type: "scale" as const },
    { id: "2", type: "text" as const },
    { id: "3", type: "choice" as const },
  ];
  const first = new SurveyDraftSession(
    "token",
    blank(),
    0,
    cache,
    async () => {
      throw Error("offline");
    },
    noop, questions,
  );
  first.update({
    answers: { "1": "4", "2": "Commentaire confidentiel inachevé", "3": "Oui" },
    currentSection: 1,
    started: true,
  });
  assert.ok(cache.getItem("token"));
  assert.equal(await first.save(), false);
  assert.equal(first.dirty, true);
  for (const currentSection of [0, 1, 0]) {
    first.update({ ...first.draft, currentSection });
    assert.equal(first.draft.answers["2"], "Commentaire confidentiel inachevé");
  }
  first.update({ ...first.draft, started: false });
  first.update({ ...first.draft, started: true });
  assert.equal(first.draft.answers["2"], "Commentaire confidentiel inachevé");
  first.persist();
  first.dispose();
  assert.ok(cache.writes.every((value) => !value.includes("Commentaire confidentiel")));
  const reopened = new SurveyDraftSession(
    "token",
    blank(),
    0,
    cache,
    accept,
    noop, questions,
  );
  assert.equal(reopened.draft.answers["2"], undefined);
  assert.deepEqual(reopened.draft, { ...first.draft, answers: { "1": "4", "3": "Oui" } });
  assert.equal(await reopened.save(), true);
  assert.equal(reopened.dirty, false);
  assert.equal(reopened.draft.answers["1"], "4");
});

test("server draft text stays available without leaking through either cached snapshot", async () => {
  const cache = storage();
  const questions = [{ id: "1", type: "choice" as const }, { id: "2", type: "text" as const }];
  const initial = { ...blank(), answers: { "1": "Oui", "2": "Texte serveur confidentiel" } };
  const session = new SurveyDraftSession("token", initial, 1, cache, accept, noop, questions);
  session.persist();
  session.update({ ...initial, answers: { "1": "Non", "2": "Texte modifié confidentiel" } });
  assert.equal(await session.save(), true);
  assert.equal(session.draft.answers["2"], "Texte modifié confidentiel");
  assert.equal(session.base.answers["2"], "Texte modifié confidentiel");
  assert.ok(cache.writes.every((value) => !value.includes("confidentiel")));
  const stored = JSON.parse(cache.getItem("token")!);
  assert.deepEqual(stored.base.answers, { "1": "Non" });
  assert.deepEqual(stored.draft.answers, { "1": "Non" });
  const reopened = new SurveyDraftSession("token", session.base, 2, cache, accept, noop, questions);
  assert.equal(reopened.draft.answers["2"], "Texte modifié confidentiel");
  assert.ok(!cache.getItem("token")!.includes("confidentiel"));
});

test("legacy cache text and unknown questions are scrubbed before restoring or rewriting", () => {
  const cache = storage();
  cache.setItem("token", JSON.stringify({
    version: 1,
    base: { ...blank(), answers: { "1": "Oui", "2": "Ancien texte serveur secret" } },
    draft: { ...blank(), answers: { "1": "Non", "2": "Ancien texte local secret", "999": "Question supprimée secrète" } },
  }));
  cache.writes.length = 0;
  const questions = [{ id: "1", type: "choice" as const }, { id: "2", type: "text" as const }];
  const session = new SurveyDraftSession("token", blank(), 0, cache, accept, noop, questions);
  assert.deepEqual(session.draft.answers, { "1": "Non" });
  assert.ok(cache.writes.length > 0);
  assert.ok(cache.writes.every((value) => !value.includes("secret") && !value.includes("999")));
  assert.deepEqual(JSON.parse(cache.getItem("token")!).draft.answers, { "1": "Non" });
});

test("a refusal to answer an open question is preserved without storing free text", () => {
  const cache = storage();
  const questions = [{ id: "1", type: "text" as const }];
  const session = new SurveyDraftSession("token", blank(), 0, cache, accept, noop, questions);
  session.update({ ...blank(), answers: { "1": "Je préfère ne pas répondre" } });
  const reopened = new SurveyDraftSession("token", blank(), 0, cache, accept, noop, questions);
  assert.equal(reopened.draft.answers["1"], "Je préfère ne pas répondre");
  reopened.update({ ...reopened.draft, answers: { "1": "Commentaire sensible" } });
  assert.deepEqual(JSON.parse(cache.getItem("token")!).draft.answers, {});
  assert.ok(cache.writes.every((value) => !value.includes("Commentaire sensible")));
});

test("text edited during an in-flight save stays in memory and reaches the server only", async () => {
  const cache = storage();
  const questions = [{ id: "1", type: "text" as const }];
  let release!: (result: SaveDraftResult) => void;
  let calls = 0;
  const session = new SurveyDraftSession("token", blank(), 0, cache, async (draft, revision) => {
    if (++calls === 1) return new Promise((resolve) => { release = resolve; });
    return accept(draft, revision);
  }, noop, questions);
  session.update({ ...blank(), answers: { "1": "Premier texte secret" } });
  const sent = toBackendDraft(session.draft);
  const saving = session.save();
  session.update({ ...session.draft, answers: { "1": "Texte secret corrigé" }, currentSection: 1 });
  release(await accept(sent, 0));
  assert.equal(await saving, true);
  assert.equal(session.draft.answers["1"], "Texte secret corrigé");
  assert.equal(session.base.answers["1"], "Texte secret corrigé");
  assert.ok(cache.writes.every((value) => !value.includes("secret")));
});

test("late saves cannot resurrect a draft after confirmed submission", async () => {
  for (const fails of [false, true]) {
    const cache = storage();
    let resolve!: (result: SaveDraftResult) => void;
    let reject!: (error: Error) => void;
    const session = new SurveyDraftSession("token", blank(), 0, cache,
      () => new Promise((ok, fail) => { resolve = ok; reject = fail; }), noop, choiceQuestions);
    session.update({ ...blank(), answers: { "1": "Oui" } });
    const saving = session.save();
    session.finish();
    if (fails) reject(new Error("late failure"));
    else resolve(await accept(toBackendDraft(session.draft), 0));
    await saving;
    session.persist(); session.dispose();
    assert.equal(session.state, "saved");
    assert.equal(cache.getItem("token"), null);
  }
});

test("a synchronized stale browser cache does not overwrite another device", () => {
  const cache = storage();
  const old = { ...blank(), answers: { "1": "old" } };
  const first = new SurveyDraftSession("token", old, 1, cache, accept, noop, choiceQuestions);
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
    noop, choiceQuestions,
  );
  assert.deepEqual(reopened.draft, remote);
  assert.equal(reopened.dirty, false);
});

test("offline local edits merge with independent remote edits, including cleared answers", () => {
  const cache = storage();
  const base = { ...blank(), answers: { "1": "old", "2": "erase" } };
  const first = new SurveyDraftSession("token", base, 1, cache, accept, noop, choiceQuestions);
  first.update({ ...base, answers: { "1": "local", "2": "" } });
  const remote = { ...base, answers: { ...base.answers, "3": "remote" } };
  const reopened = new SurveyDraftSession(
    "token",
    remote,
    2,
    cache,
    accept,
    noop, choiceQuestions,
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
    noop, choiceQuestions,
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
    noop, choiceQuestions,
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
    noop, choiceQuestions,
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
  const old = new SurveyDraftSession("token", oldDraft, 5, cache, accept, noop, choiceQuestions);
  old.persist();
  // The backend refreshed the questionnaire and reset the saved position.
  const reopened = new SurveyDraftSession(
    "token", { ...oldDraft, currentSection: 0 }, 6, cache, accept, noop, choiceQuestions,
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
  const old = new SurveyDraftSession("token", oldDraft, 5, cache, accept, noop, choiceQuestions);
  old.update({ ...oldDraft, answers: { "1": "offline edit", "9": "offline obsolete" } });
  const reopened = new SurveyDraftSession(
    "token", { answers: { "1": "saved" }, currentSection: 0, started: true }, 6, cache, accept, noop, choiceQuestions,
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
    noop, choiceQuestions,
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
    noop, choiceQuestions,
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
    noop, choiceQuestions,
  );
  reopened.update({ ...blank(), answers: { "1": "new" } });
  const before = cache.getItem("token");
  release(await accept(toBackendDraft(old.draft), 0));
  await saving;
  assert.equal(cache.getItem("token"), before);
});
