"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getTrpcClient } from "@/lib/trpc/client";
import {
  fromBackendDraft,
  resumeSection,
  SurveyDraftSession,
  type BackendSurveyDraft,
  type SurveyDraft,
} from "@/lib/responses/survey-draft";

export function useSurveyDraft({
  token,
  initialDraft,
  revision,
  completed,
  started,
  sections,
  totalSteps,
}: {
  token?: string | null;
  initialDraft?: BackendSurveyDraft | null;
  revision: number;
  completed: boolean;
  started: boolean;
  sections: string[][];
  totalSteps: number;
}) {
  const session = useRef<SurveyDraftSession | null>(null);
  const [view, setView] = useState(() => ({
    draft: fromBackendDraft(initialDraft, started),
    state: "saved" as SurveyDraftSession["state"],
    completed,
    ready: false,
  }));

  useEffect(() => {
    let active = true;
    let storage: Storage | null = null;
    try {
      storage = window.localStorage;
    } catch {
      /* Private browser settings. */
    }
    const current = new SurveyDraftSession(
      `rps-survey-draft:${token ?? "preview"}`,
      fromBackendDraft(initialDraft, started),
      revision,
      token ? storage : null,
      (draft, draftRevision) =>
        getTrpcClient().surveyResponses.saveDraft.mutate({
          participantToken: token!,
          revision: draftRevision,
          ...draft,
        }),
      () => {
        if (active)
          setView({
            draft: current.draft,
            state: current.state,
            completed: current.completed,
            ready: true,
          });
      },
    );
    session.current = current;
    if (completed) current.finish();
    else {
      const validIds = new Set(sections.flat());
      const draft = {
        ...current.draft,
        answers: Object.fromEntries(
          Object.entries(current.draft.answers).filter(([id]) =>
            validIds.has(id),
          ),
        ),
      };
      current.update({
        ...draft,
        currentSection: resumeSection(draft, sections, totalSteps),
      });
    }

    const save = () => {
      if (token && !current.completed) void current.save();
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      current.persist();
      if (token && current.dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const pageHide = () => {
      current.persist();
      save();
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") pageHide();
    };
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("pagehide", pageHide);
    window.addEventListener("online", save);
    document.addEventListener("visibilitychange", visibility);
    const retry = window.setInterval(save, 15000);
    save();
    return () => {
      active = false;
      current.dispose();
      window.clearInterval(retry);
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("pagehide", pageHide);
      window.removeEventListener("online", save);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [token, initialDraft, revision, completed, started, sections, totalSteps]);

  useEffect(() => {
    if (!token || !view.ready || view.completed) return;
    const timer = window.setTimeout(() => {
      void session.current?.save();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [token, view.draft, view.ready, view.completed]);

  const update = useCallback((change: (draft: SurveyDraft) => SurveyDraft) => {
    const current = session.current;
    if (current) current.update(change(current.draft));
  }, []);
  const setAnswers = useCallback(
    (change: (answers: Record<string, string>) => Record<string, string>) => {
      update((draft) => ({
        ...draft,
        answers: change(draft.answers),
        started: true,
      }));
    },
    [update],
  );
  const setCurrentSectionIndex = useCallback(
    (change: (index: number) => number) => {
      update((draft) => ({
        ...draft,
        currentSection: change(draft.currentSection),
      }));
    },
    [update],
  );
  const setHasStarted = useCallback(
    (value: boolean) => {
      update((draft) => ({ ...draft, started: value }));
    },
    [update],
  );

  return {
    ...view,
    setAnswers,
    setCurrentSectionIndex,
    setHasStarted,
    save: () => session.current?.save() ?? Promise.resolve(false),
    getSnapshot: () => ({
      draft: session.current!.draft,
      revision: session.current!.revision,
    }),
    finish: () => session.current?.finish(),
  };
}
