import assert from "node:assert/strict";
import test from "node:test";
import {
  AGREEMENT_SCALE_OPTIONS,
  FREQUENCY_SCALE_OPTIONS,
  getScaleEditorType,
  getScaleEditorOptions,
  QUESTION_SUGGESTION_SECTIONS,
} from "./question-suggestions.ts";

test("reconnaît A et F à partir des options enregistrées, y compris les anciennes apostrophes", () => {
  assert.equal(getScaleEditorType(AGREEMENT_SCALE_OPTIONS), "scale_a");
  assert.equal(getScaleEditorType(FREQUENCY_SCALE_OPTIONS), "scale_f");
  assert.equal(getScaleEditorType(AGREEMENT_SCALE_OPTIONS.map((label) => label.replaceAll("’", "'"))), "scale_a");
  assert.equal(getScaleEditorType(["1", "2", "3", "4", "5"]), "scale");
  assert.equal(getScaleEditorType(undefined), "scale");
  const custom = ["Très faible", "Faible", "Moyen", "Fort", "Très fort"];
  assert.equal(getScaleEditorType(custom), "scale");
  assert.deepEqual(custom, ["Très faible", "Faible", "Moyen", "Fort", "Très fort"]);
});

test("sélectionner une échelle fournit ses cinq options sans altérer les modèles", () => {
  for (const type of ["scale", "scale_a", "scale_f"] as const) {
    const options = getScaleEditorOptions(type)!;
    assert.equal(options.length, 5);
    assert.equal(getScaleEditorType(options), type);
  }
  const agreement = getScaleEditorOptions("scale_a")!;
  assert.deepEqual(agreement, [...AGREEMENT_SCALE_OPTIONS]);
  agreement[0] = "Libellé personnalisé";
  assert.equal(getScaleEditorOptions("scale_a")![0], AGREEMENT_SCALE_OPTIONS[0]);
  assert.deepEqual(getScaleEditorOptions("scale_f"), [...FREQUENCY_SCALE_OPTIONS]);
  assert.deepEqual(getScaleEditorOptions("scale"), ["1", "2", "3", "4", "5"]);
  assert.equal(getScaleEditorOptions("choice"), undefined);
  assert.equal(getScaleEditorOptions("text"), undefined);
});

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
