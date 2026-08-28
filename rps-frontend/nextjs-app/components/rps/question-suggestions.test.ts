import assert from "node:assert/strict";
import test from "node:test";
import {
  AGREEMENT_SCALE_OPTIONS,
  FREQUENCY_SCALE_OPTIONS,
  QUESTION_SUGGESTION_SECTIONS,
} from "./question-suggestions.ts";

test("propose uniquement les sections 1 à 9", () => {
  assert.deepEqual(
    QUESTION_SUGGESTION_SECTIONS.map((section) => section.number),
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  assert.equal(QUESTION_SUGGESTION_SECTIONS.at(-1)?.optional, true);
});

test("reprend toutes les questions configurables du questionnaire V2", () => {
  assert.equal(
    QUESTION_SUGGESTION_SECTIONS.reduce(
      (total, section) => total + section.questions.length,
      0,
    ),
    37,
  );
  assert.equal(
    QUESTION_SUGGESTION_SECTIONS[0].questions[0].title,
    "Au cours des 4 dernières semaines, à quelle fréquence avez-vous manqué de temps pour accomplir l’ensemble de vos tâches?",
  );
  assert.equal(
    QUESTION_SUGGESTION_SECTIONS[7].questions[0].title,
    "Souhaitez-vous ajouter quelque chose sur votre expérience de travail?",
  );
});

test("associe les bonnes échelles sans les ajouter aux titres", () => {
  for (const sectionNumber of [1, 7]) {
    const section = QUESTION_SUGGESTION_SECTIONS.find(
      (entry) => entry.number === sectionNumber,
    );
    for (const question of section?.questions ?? []) {
      assert.deepEqual(question.options, FREQUENCY_SCALE_OPTIONS);
    }
  }

  for (const sectionNumber of [2, 3, 4, 5, 6]) {
    const section = QUESTION_SUGGESTION_SECTIONS.find(
      (entry) => entry.number === sectionNumber,
    );
    for (const question of section?.questions ?? []) {
      assert.deepEqual(question.options, AGREEMENT_SCALE_OPTIONS);
    }
  }

  assert.equal(
    QUESTION_SUGGESTION_SECTIONS.some((section) => /échelle [AF]/i.test(section.title)),
    false,
  );
});
