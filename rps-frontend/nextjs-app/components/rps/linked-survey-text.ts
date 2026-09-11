import { createElement, Fragment } from "react";

type TextPart = { text: string; href?: string };

export function splitSurveyTextLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  const urls = /https?:\/\/[^\s<>"'\u0000-\u001f\u007f«»“”‘’]+/giu;
  let cursor = 0;

  for (const match of text.matchAll(urls)) {
    let candidate = match[0];
    // Leave sentence punctuation and unmatched closing brackets as plain text.
    while (candidate) {
      const last = candidate.at(-1)!;
      if (/[.,;:!?]/u.test(last)) {
        candidate = candidate.slice(0, -1);
        continue;
      }
      const opening = ({ ")": "(", "]": "[", "}": "{" } as Record<string, string>)[last];
      if (opening && candidate.split(last).length > candidate.split(opening).length) {
        candidate = candidate.slice(0, -1);
        continue;
      }
      break;
    }

    try {
      const url = new URL(candidate);
      if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) continue;
    } catch {
      continue;
    }

    const start = match.index;
    if (start > cursor) parts.push({ text: text.slice(cursor, start) });
    parts.push({ text: candidate, href: candidate });
    cursor = start + candidate.length;
  }

  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}

// React escapes all content: stored text is never interpreted as HTML.
export function LinkedSurveyText({ text }: { text: string }) {
  return createElement(Fragment, null, ...splitSurveyTextLinks(text).map((part, index) =>
    part.href
      ? createElement("a", {
          key: index,
          href: part.href,
          target: "_blank",
          rel: "noopener noreferrer",
          referrerPolicy: "no-referrer",
          className: "break-words text-sky-700 underline underline-offset-2 hover:text-sky-900",
        }, part.text)
      : part.text,
  ));
}
