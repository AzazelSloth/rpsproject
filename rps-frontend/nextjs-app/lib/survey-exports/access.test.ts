import assert from "node:assert/strict";
import test from "node:test";
import {
  hasSurveyExportPermission,
  parseSurveyExportParams,
} from "./access.ts";

test("affiche les exports uniquement avec la permission explicite du serveur", () => {
  assert.equal(hasSurveyExportPermission(["EXPORT_SURVEY_RESPONSES"]), true);
  assert.equal(hasSurveyExportPermission([]), false);
  assert.equal(hasSurveyExportPermission(undefined), false);
  assert.equal(hasSurveyExportPermission(["ADMIN"]), false);
});

test("valide uniquement une campagne positive et un type d'export connu", () => {
  assert.deepEqual(parseSurveyExportParams("42", "closed"), {
    campaignId: 42,
    kind: "closed",
  });
  assert.deepEqual(parseSurveyExportParams("42", "text"), {
    campaignId: 42,
    kind: "text",
  });
  assert.equal(parseSurveyExportParams("0", "closed"), null);
  assert.equal(parseSurveyExportParams("12.5", "closed"), null);
  assert.equal(parseSurveyExportParams("42", "employees"), null);
});
