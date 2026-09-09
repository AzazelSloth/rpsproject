import {
  isPreferNotToAnswer,
  PREFER_NOT_TO_ANSWER,
} from "../../components/rps/survey-response-answer.ts";

export type SurveyDraft = {
  answers: Record<string, string>;
  currentSection: number;
  started: boolean;
};

export type BackendSurveyDraft = {
  responses: {
    question_id: number;
    answer: string | null;
    response_state: "answered" | "declined";
  }[];
  current_section: number;
  started: boolean;
};

export type SaveDraftResult = {
  saved: boolean;
  completed: boolean;
  revision: number;
  draft: BackendSurveyDraft | null;
};

export function fromBackendDraft(
  draft: BackendSurveyDraft | null | undefined,
  started = false,
): SurveyDraft {
  return {
    answers: Object.fromEntries(
      (draft?.responses ?? []).map((item) => [
        String(item.question_id),
        item.response_state === "declined"
          ? PREFER_NOT_TO_ANSWER
          : (item.answer ?? ""),
      ]),
    ),
    currentSection: draft?.current_section ?? 0,
    started: draft?.started ?? started,
  };
}

export function toBackendDraft(draft: SurveyDraft): BackendSurveyDraft {
  return {
    responses: Object.entries(draft.answers)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([id, answer]) => ({
        question_id: Number(id),
        answer: isPreferNotToAnswer(answer) ? null : answer,
        response_state: isPreferNotToAnswer(answer) ? "declined" : "answered",
      })),
    current_section: draft.currentSection,
    started: draft.started,
  };
}

export function sameDraft(a: SurveyDraft, b: SurveyDraft) {
  return (
    JSON.stringify(toBackendDraft(a)) === JSON.stringify(toBackendDraft(b))
  );
}

// Replay only local changes onto the server snapshot; never replace unrelated
// answers saved on another device with a stale local copy.
export function mergeDraft(
  base: SurveyDraft,
  local: SurveyDraft,
  remote: SurveyDraft,
): SurveyDraft {
  const answers = { ...remote.answers };
  for (const key of new Set([
    ...Object.keys(base.answers),
    ...Object.keys(local.answers),
  ])) {
    if (base.answers[key] !== local.answers[key]) {
      if (local.answers[key] === undefined) delete answers[key];
      else answers[key] = local.answers[key];
    }
  }
  return {
    answers,
    currentSection:
      local.currentSection !== base.currentSection
        ? local.currentSection
        : remote.currentSection,
    started: local.started !== base.started ? local.started : remote.started,
  };
}

function isDraft(value: unknown): value is SurveyDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as SurveyDraft;
  return (
    Number.isInteger(draft.currentSection) &&
    draft.currentSection >= 0 &&
    typeof draft.started === "boolean" &&
    Boolean(draft.answers) &&
    typeof draft.answers === "object" &&
    !Array.isArray(draft.answers) &&
    Object.entries(draft.answers).every(
      ([id, answer]) => /^[1-9]\d*$/.test(id) && typeof answer === "string",
    )
  );
}

export type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export class SurveyDraftSession {
  draft: SurveyDraft;
  base: SurveyDraft;
  revision: number;
  state: "saved" | "dirty" | "saving" | "error" = "saved";
  completed = false;
  private inFlight: Promise<boolean> | null = null;
  private disposed = false;
  readonly key: string;
  private readonly storage: DraftStorage | null;
  private readonly send: (
    draft: BackendSurveyDraft,
    revision: number,
  ) => Promise<SaveDraftResult>;
  private readonly changed: () => void;

  constructor(
    key: string,
    initial: SurveyDraft,
    revision: number,
    storage: DraftStorage | null,
    send: (
      draft: BackendSurveyDraft,
      revision: number,
    ) => Promise<SaveDraftResult>,
    changed: () => void,
  ) {
    this.key = key;
    this.storage = storage;
    this.send = send;
    this.changed = changed;
    this.base = initial;
    this.draft = initial;
    this.revision = revision;
    try {
      const raw = storage?.getItem(key);
      const cached = raw ? JSON.parse(raw) : null;
      if (
        cached?.version === 1 &&
        isDraft(cached.base) &&
        isDraft(cached.draft)
      ) {
        this.draft = mergeDraft(cached.base, cached.draft, initial);
      }
    } catch {
      /* A blocked or corrupt cache must not prevent answering. */
    }
    this.state = this.dirty ? "dirty" : "saved";
  }

  get dirty() {
    return !this.completed && !sameDraft(this.base, this.draft);
  }

  persist() {
    if (this.completed || this.disposed) return;
    try {
      this.storage?.setItem(
        this.key,
        JSON.stringify({ version: 1, base: this.base, draft: this.draft }),
      );
    } catch {
      /* Server synchronization and the exit guard remain available. */
    }
  }

  update(draft: SurveyDraft) {
    if (this.completed || this.disposed) return;
    this.draft = draft;
    this.state = this.dirty ? "dirty" : "saved";
    // Synchronous local write: an immediate close must not wait for a React effect.
    this.persist();
    this.changed();
  }

  finish() {
    this.completed = true;
    this.state = "saved";
    try {
      this.storage?.removeItem(this.key);
    } catch {
      /* best effort */
    }
    this.changed();
  }

  dispose() {
    this.persist();
    this.disposed = true;
  }

  save(): Promise<boolean> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.synchronize().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async synchronize() {
    let conflicts = 0;
    while (this.dirty && !this.disposed) {
      const sent = this.draft;
      this.state = "saving";
      this.changed();
      try {
        const result = await this.send(toBackendDraft(sent), this.revision);
        if (this.disposed) return false;
        if (result.completed) {
          this.finish();
          return false;
        }
        const remote = fromBackendDraft(result.draft, this.base.started);
        this.draft = mergeDraft(
          result.saved ? sent : this.base,
          this.draft,
          remote,
        );
        this.base = remote;
        this.revision = result.revision;
        this.persist();
        if (!result.saved && ++conflicts >= 3)
          throw new Error("Concurrent draft updates");
      } catch {
        if (this.disposed) return false;
        this.state = "error";
        this.persist();
        this.changed();
        return false;
      }
    }
    this.state = "saved";
    this.changed();
    return !this.completed;
  }
}

export function resumeSection(
  draft: SurveyDraft,
  sections: string[][],
  totalSteps: number,
) {
  let index = Math.min(draft.currentSection, Math.max(0, totalSteps - 1));
  while (
    index < sections.length &&
    index < totalSteps - 1 &&
    sections[index].length > 0 &&
    sections[index].every((id) => Boolean(draft.answers[id]?.trim()))
  ) {
    index++;
  }
  return index;
}

export function restoreDraftProgress(
  draft: SurveyDraft,
  sections: string[][],
  totalSteps: number,
): SurveyDraft {
  const validQuestionIds = new Set(sections.flat());
  const answers = Object.fromEntries(
    Object.entries(draft.answers).filter(([id]) => validQuestionIds.has(id)),
  );
  const currentSection = resumeSection(
    { ...draft, answers },
    sections,
    totalSteps,
  );

  return {
    answers,
    currentSection,
    started:
      draft.started ||
      currentSection > 0 ||
      Object.values(answers).some((answer) => Boolean(answer.trim())),
  };
}
