"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getTrpcClient } from "@/lib/trpc/client";
import { SurveyTimingTracker } from "@/lib/responses/survey-timing";
import {
  fromBackendDraft,
  restoreDraftProgress,
  SurveyDraftSession,
  type BackendSurveyDraft,
  type SurveyDraft,
  type DraftQuestion,
} from "@/lib/responses/survey-draft";

export function useSurveyDraft({
  token,
  initialDraft,
  revision,
  completed,
  started,
  sections,
  totalSteps,
  questions,
}: {
  token?: string | null;
  initialDraft?: BackendSurveyDraft | null;
  revision: number;
  completed: boolean;
  started: boolean;
  sections: string[][];
  totalSteps: number;
  questions: readonly DraftQuestion[];
}) {
  const session = useRef<SurveyDraftSession | null>(null);
  const timing = useRef<SurveyTimingTracker | null>(null);
  const [view, setView] = useState(() => ({
    draft: restoreDraftProgress(
      fromBackendDraft(initialDraft, started),
      sections,
      totalSteps,
    ),
    state: "saved" as SurveyDraftSession["state"],
    lastSavedAt: null as number | null,
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
    let timer: SurveyTimingTracker | null = null;
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
        if (active) {
          if (current.completed) timer?.finish();
          setView({
            draft: current.draft,
            state: current.state,
            lastSavedAt: current.lastSavedAt,
            completed: current.completed,
            ready: true,
          });
        }
      },
      questions,
    );
    session.current = current;
    timer = token ? new SurveyTimingTracker(
      `rps-survey-timing:${token}`, storage,
      (payload) => getTrpcClient().surveyResponses.saveTiming.mutate({ participantToken: token, ...payload }),
      document.visibilityState === 'visible',
    ) : null;
    timing.current = timer;
    if (completed) { current.finish(); timer?.finish(); }
    else {
      if (Object.values(current.draft.answers).some((answer) => answer.trim())) timer?.start();
      current.update(restoreDraftProgress(current.draft, sections, totalSteps));
    }

    const save = () => {
      if (token && !current.completed) void current.save();
      if (!current.completed) void timer?.flush();
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      current.persist();
      if (token && current.dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const pageHide = () => {
      timer?.setVisible(false);
      current.persist();
      save();
    };
    const visibility = () => {
      timer?.setVisible(document.visibilityState === 'visible');
      if (document.visibilityState === "hidden") pageHide();
    };
    const activity = () => { if (!current.completed) timer?.activity(); };
    const pageShow = () => { timer?.setVisible(document.visibilityState === 'visible'); };
    document.addEventListener('pointerdown', activity);
    document.addEventListener('keydown', activity);
    document.addEventListener('scroll', activity, true);
    window.addEventListener('pageshow', pageShow);
    const tick = window.setInterval(() => {
      if (current.completed) timer?.finish();
      else timer?.tick();
    }, 5000);
    window.addEventListener("beforeunload", beforeUnload);
    window.addEventListener("pagehide", pageHide);
    window.addEventListener("online", save);
    document.addEventListener("visibilitychange", visibility);
    const retry = window.setInterval(save, 15000);
    save();
    return () => {
      active = false;
      timer?.setVisible(false);
      void timer?.flush();
      timer?.dispose();
      current.dispose();
      window.clearInterval(retry);
      window.clearInterval(tick);
      document.removeEventListener('pointerdown', activity);
      document.removeEventListener('keydown', activity);
      document.removeEventListener('scroll', activity, true);
      window.removeEventListener('pageshow', pageShow);
      window.removeEventListener("beforeunload", beforeUnload);
      window.removeEventListener("pagehide", pageHide);
      window.removeEventListener("online", save);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [token, initialDraft, revision, completed, started, sections, totalSteps, questions]);

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
      update((draft) => {
        const answers = change(draft.answers);
        if (Object.values(answers).some((answer) => answer.trim())) timing.current?.start();
        return { ...draft, answers, started: true };
      });
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
    pauseTiming: () => timing.current?.setVisible(false),
    resumeTiming: () => timing.current?.setVisible(document.visibilityState === 'visible'),
    getSnapshot: () => ({
      draft: session.current!.draft,
      revision: session.current!.revision,
      timing: timing.current?.snapshot(),
    }),
    finish: () => { timing.current?.finish(); session.current?.finish(); },
  };
}
