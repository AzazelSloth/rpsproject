import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LinkedSurveyText, splitSurveyTextLinks } from "./linked-survey-text.ts";

test("preserves all text, whitespace and line breaks", () => {
  for (const text of ["", "Texte sans lien\n\nConclusion.", "  Voir https://example.com/a.\nMerci !  "]) {
    assert.equal(splitSurveyTextLinks(text).map((part) => part.text).join(""), text);
  }
});

test("links multiple HTTP/HTTPS URLs, retaining query parameters, fragments and accents", () => {
  const text = "Voir https://example.com/été?a=1&b=2#suite puis HTTP://example.org/page";
  assert.deepEqual(splitSurveyTextLinks(text).filter((part) => part.href).map((part) => part.href), [
    "https://example.com/été?a=1&b=2#suite", "HTTP://example.org/page",
  ]);
});

test("keeps surrounding French punctuation outside links, but balanced parentheses inside", () => {
  const text = "«https://example.com/a», (https://example.org/page_(test)).";
  const parts = splitSurveyTextLinks(text);
  assert.deepEqual(parts.filter((part) => part.href).map((part) => part.href), [
    "https://example.com/a", "https://example.org/page_(test)",
  ]);
  assert.equal(parts.map((part) => part.text).join(""), text);
});

test("does not link invalid addresses, other protocols or URLs containing credentials", () => {
  const text = "javascript:alert(1) data:text/html,test mailto:contact@example.com https:// http:/// https://user:pass@example.com";
  assert.equal(splitSurveyTextLinks(text).filter((part) => part.href).length, 0);
  assert.equal(splitSurveyTextLinks(text).map((part) => part.text).join(""), text);
});

test("keeps invalid URLs as text while still recognizing the next valid URL", () => {
  const text = "https:// puis https://example.com. Fin";
  const parts = splitSurveyTextLinks(text);
  assert.equal(parts.filter((part) => part.href).length, 1);
  assert.equal(parts.map((part) => part.text).join(""), text);
});

test("rendered links open separately without sharing the participant page URL", () => {
  const html = renderToStaticMarkup(createElement(LinkedSurveyText, { text: "Lien https://example.com?a=1&b=2" }));
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
  assert.match(html, /referrerPolicy="no-referrer"/i);
  assert.match(html, /href="https:\/\/example.com\?a=1&amp;b=2"/);
});

test("renders stored HTML and scripts as literal text, never as executable markup", () => {
  const html = renderToStaticMarkup(createElement(LinkedSurveyText, {
    text: '<script>alert(1)</script> <img src=x onerror="alert(2)"> https://example.com/"onclick="alert(3)',
  }));
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img"));
  assert.ok(!html.includes(' onclick="'));
  assert.ok(html.includes("&lt;script&gt;"));
});
