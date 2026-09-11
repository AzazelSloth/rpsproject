import assert from "node:assert/strict";
import test from "node:test";
import { isSurveyTimingAllowedEmail } from "./auth-config.ts";

test("autorise l'horodatage avec la liste serveur existante", () => {
  const previousTestSurvey = process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS;

  try {
    process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS =
      "toky.rao@gmail.com,genevieve.majorbr@gmail.com,cathynomeniavo@gmail.com";

    assert.equal(isSurveyTimingAllowedEmail("cathynomeniavo@gmail.com"), true);
    assert.equal(isSurveyTimingAllowedEmail("other@gmail.com"), false);
  } finally {
    restoreEnv("TEST_SURVEY_DELETE_ALLOWED_EMAILS", previousTestSurvey);
  }
});

test("refuse l'horodatage sans liste commune configurée", () => {
  const previous = process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS;
  try {
    for (const value of [undefined, "", "   "]) {
      restoreEnv("TEST_SURVEY_DELETE_ALLOWED_EMAILS", value);
      assert.equal(isSurveyTimingAllowedEmail("cathynomeniavo@gmail.com"), false);
    }
    process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS = " Cathy@Example.com ";
    assert.equal(isSurveyTimingAllowedEmail(" CATHY@example.com "), true);
  } finally {
    restoreEnv("TEST_SURVEY_DELETE_ALLOWED_EMAILS", previous);
  }
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
