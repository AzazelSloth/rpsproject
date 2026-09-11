import assert from "node:assert/strict";
import test from "node:test";
import { isSurveyTimingAllowedEmail } from "./auth-config.ts";

test("autorise l'horodatage avec la liste serveur existante", () => {
  const previousTiming = process.env.SURVEY_TIMING_ALLOWED_EMAILS;
  const previousTestSurvey = process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS;

  try {
    delete process.env.SURVEY_TIMING_ALLOWED_EMAILS;
    process.env.TEST_SURVEY_DELETE_ALLOWED_EMAILS =
      "toky.rao@gmail.com,genevieve.majorbr@gmail.com,cathynomeniavo@gmail.com";

    assert.equal(isSurveyTimingAllowedEmail("cathynomeniavo@gmail.com"), true);
    assert.equal(isSurveyTimingAllowedEmail("other@gmail.com"), false);
  } finally {
    restoreEnv("SURVEY_TIMING_ALLOWED_EMAILS", previousTiming);
    restoreEnv("TEST_SURVEY_DELETE_ALLOWED_EMAILS", previousTestSurvey);
  }
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
