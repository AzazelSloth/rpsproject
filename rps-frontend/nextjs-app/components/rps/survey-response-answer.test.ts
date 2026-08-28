import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSurveySubmissionAnswers,
  isPreferNotToAnswer,
  PREFER_NOT_TO_ANSWER,
  togglePreferNotToAnswer,
} from "./survey-response-answer.ts";

test("sélectionne le refus depuis une question vide", () => {
  assert.equal(togglePreferNotToAnswer(), PREFER_NOT_TO_ANSWER);
});

test("remplace une réponse d'échelle, de choix ou de texte par le refus", () => {
  for (const answer of ["4", "Partiellement", "Un commentaire libre"]) {
    assert.equal(togglePreferNotToAnswer(answer), PREFER_NOT_TO_ANSWER);
  }
});

test("désélectionne le refus et le distingue des autres réponses", () => {
  assert.equal(togglePreferNotToAnswer(PREFER_NOT_TO_ANSWER), "");
  assert.equal(isPreferNotToAnswer(PREFER_NOT_TO_ANSWER), true);
  assert.equal(isPreferNotToAnswer(""), false);
  assert.equal(isPreferNotToAnswer("5"), false);
});

test("distingue réponse, refus et question vide dans une soumission partielle", () => {
  assert.deepEqual(
    buildSurveySubmissionAnswers(["1", "2", "3"], {
      "1": "4",
      "2": PREFER_NOT_TO_ANSWER,
      "3": "",
    }),
    [
      { questionId: 1, answer: "4", responseState: "answered" },
      { questionId: 2, answer: null, responseState: "declined" },
    ],
  );
});

test("autorise une soumission sans aucune réponse", () => {
  assert.deepEqual(buildSurveySubmissionAnswers(["1", "2"], {}), []);
});
