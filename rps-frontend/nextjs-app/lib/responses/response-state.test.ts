import assert from "node:assert/strict";
import test from "node:test";

import {
  getValidScaleResponseValues,
  isAnsweredResponseState,
} from "./response-state.ts";

test("excludes refusals and empty answers from statistical scale values", () => {
  const values = getValidScaleResponseValues([
    { answer: "4", responseState: "answered" },
    { answer: null, responseState: "declined" },
    { answer: "Je préfère ne pas répondre", responseState: "declined" },
    { answer: null, responseState: "answered" },
    { answer: "", responseState: "answered" },
  ]);

  assert.deepEqual(values, [4]);
});

test("keeps legacy responses without a state as answered", () => {
  assert.equal(isAnsweredResponseState(undefined), true);
  assert.deepEqual(getValidScaleResponseValues([{ answer: "3" }]), [3]);
});
