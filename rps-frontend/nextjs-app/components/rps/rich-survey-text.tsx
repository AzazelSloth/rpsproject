"use client";

import { useEffect, useRef } from "react";
import sanitizeHtml from "sanitize-html";
import { LinkedSurveyText } from "@/components/rps/linked-survey-text";

const RICH_TEXT_MARKER = "<!--rps-rich-text-->";

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "ul", "ol", "li", "strong", "em", "a"],
  allowedAttributes: {
    a: ["href", "target", "rel", "referrerpolicy"],
  },
  allowedSchemes: ["http", "https"],
  allowedSchemesByTag: {
    a: ["http", "https"],
  },
  transformTags: {
    b: "strong",
    i: "em",
    a: (_tagName, attributes) => ({
      tagName: "a",
      attribs: {
        href: attributes.href ?? "",
        target: "_blank",
        rel: "noopener noreferrer",
        referrerpolicy: "no-referrer",
      },
    }),
  },
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function plainTextToHtml(value: string) {
  return escapeHtml(value).replaceAll("\n", "<br>");
}

function sanitizeSurveyHtml(value: string) {
  return sanitizeHtml(value, SANITIZE_OPTIONS);
}

function getStoredHtml(value: string) {
  return sanitizeSurveyHtml(value.slice(RICH_TEXT_MARKER.length));
}

function isRichText(value: string) {
  return value.startsWith(RICH_TEXT_MARKER);
}

function getEditableHtml(value: string) {
  return isRichText(value) ? getStoredHtml(value) : plainTextToHtml(value);
}

function getPlainTextFromHtml(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replaceAll("&nbsp;", " ")
    .trim();
}

function serializeRichText(value: string) {
  const sanitized = sanitizeSurveyHtml(value);
  return getPlainTextFromHtml(sanitized) ? `${RICH_TEXT_MARKER}${sanitized}` : "";
}

export function getSurveyTextLength(value: string) {
  if (!isRichText(value)) {
    return value.length;
  }

  return getPlainTextFromHtml(getStoredHtml(value)).length;
}

export function RichSurveyText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  if (!isRichText(text)) {
    return (
      <div className={`whitespace-pre-wrap ${className}`}>
        <LinkedSurveyText text={text} />
      </div>
    );
  }

  return (
    <div
      className={`space-y-3 break-words [&_a]:text-sky-700 [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-sky-900 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 ${className}`}
      dangerouslySetInnerHTML={{ __html: getStoredHtml(text) }}
    />
  );
}

export function SurveyRichTextEditor({
  id,
  value,
  onChange,
  maxLength = 10000,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValidHtmlRef = useRef(getEditableHtml(value));

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor) {
      return;
    }

    const nextHtml = getEditableHtml(value);
    if (editor.innerHTML !== nextHtml) {
      editor.innerHTML = nextHtml;
      lastValidHtmlRef.current = nextHtml;
    }
  }, [value]);

  function publishEditorValue() {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const serialized = serializeRichText(editor.innerHTML);
    if (serialized.length > maxLength) {
      editor.innerHTML = lastValidHtmlRef.current;
      return;
    }

    lastValidHtmlRef.current = getEditableHtml(serialized);
    onChange(serialized);
  }

  function runCommand(command: "bold" | "italic" | "insertUnorderedList" | "insertOrderedList") {
    editorRef.current?.focus();
    document.execCommand(command);
    publishEditorValue();
  }

  function addLink() {
    const selection = window.getSelection();
    if (!selection?.rangeCount || selection.isCollapsed) {
      return;
    }

    const range = selection.getRangeAt(0).cloneRange();
    const href = window.prompt("Adresse du lien (https://…)")?.trim();
    if (!href || !/^https?:\/\/[^\s]+$/i.test(href)) {
      return;
    }

    editorRef.current?.focus();
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("createLink", false, href);
    publishEditorValue();
  }

  function insertPlainText(value: string) {
    document.execCommand("insertText", false, value);
    publishEditorValue();
  }

  const toolbarButtonClass =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50";

  return (
    <div className="mt-2 overflow-hidden rounded-[12px] border border-slate-200 bg-white focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-100">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2" role="toolbar">
        <button type="button" className={toolbarButtonClass} onMouseDown={(event) => { event.preventDefault(); runCommand("bold"); }} aria-label="Gras">
          B
        </button>
        <button type="button" className={`${toolbarButtonClass} italic`} onMouseDown={(event) => { event.preventDefault(); runCommand("italic"); }} aria-label="Italique">
          I
        </button>
        <button type="button" className={toolbarButtonClass} onMouseDown={(event) => { event.preventDefault(); runCommand("insertUnorderedList"); }} aria-label="Liste à puces">
          • Liste
        </button>
        <button type="button" className={toolbarButtonClass} onMouseDown={(event) => { event.preventDefault(); runCommand("insertOrderedList"); }} aria-label="Liste numérotée">
          1. Liste
        </button>
        <button type="button" className={toolbarButtonClass} onMouseDown={(event) => { event.preventDefault(); addLink(); }} aria-label="Ajouter un lien">
          Lien
        </button>
      </div>
      <div
        ref={editorRef}
        id={id}
        contentEditable
        suppressContentEditableWarning
        onInput={publishEditorValue}
        onPaste={(event) => {
          event.preventDefault();
          insertPlainText(event.clipboardData.getData("text/plain"));
        }}
        onDrop={(event) => {
          event.preventDefault();
          insertPlainText(event.dataTransfer.getData("text/plain"));
        }}
        className="min-h-48 px-4 py-3 text-sm leading-6 text-slate-800 outline-none [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: getEditableHtml(value) }}
      />
    </div>
  );
}
