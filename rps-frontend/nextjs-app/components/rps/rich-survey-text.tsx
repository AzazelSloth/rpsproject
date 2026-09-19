"use client";

import { useEffect, useRef, useState } from "react";
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
  const selectedRangeRef = useRef<Range | null>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    editor.innerHTML = getEditableHtml(value);
    lastValidHtmlRef.current = editor.innerHTML;
    // Initialiser le DOM une seule fois permet de conserver la position du curseur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function openLinkDialog() {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const selection = window.getSelection();
    let range: Range | null = null;

    if (selection?.rangeCount) {
      const selectedRange = selection.getRangeAt(0);
      const rangeContainer =
        selectedRange.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
          ? selectedRange.commonAncestorContainer
          : selectedRange.commonAncestorContainer.parentElement;

      if (rangeContainer && editor.contains(rangeContainer)) {
        range = selectedRange.cloneRange();
      }
    }

    if (!range) {
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
    }

    selectedRangeRef.current = range;
    setLinkText(range.toString());
    setLinkUrl("");
    setLinkError("");
    setIsLinkDialogOpen(true);
  }

  function closeLinkDialog() {
    setIsLinkDialogOpen(false);
    setLinkError("");
    selectedRangeRef.current = null;
  }

  function applyLink() {
    const editor = editorRef.current;
    const range = selectedRangeRef.current;
    const displayedText = linkText.trim();
    const href = linkUrl.trim();

    if (!displayedText) {
      setLinkError("Saisissez le texte à afficher.");
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(href);
    } catch {
      setLinkError("Saisissez une adresse complète, par exemple https://exemple.com.");
      return;
    }

    if (!editor || !range || !["http:", "https:"].includes(parsedUrl.protocol)) {
      setLinkError("Le lien doit commencer par http:// ou https://.");
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = parsedUrl.toString();
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.referrerPolicy = "no-referrer";
    anchor.textContent = displayedText;

    range.deleteContents();
    range.insertNode(anchor);
    range.setStartAfter(anchor);
    range.collapse(true);

    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    editor.focus();
    publishEditorValue();
    closeLinkDialog();
  }
  function insertPlainText(value: string) {
    document.execCommand("insertText", false, value);
    publishEditorValue();
  }

  const toolbarButtonClass =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50";

  return (
    <>
      <div className="mt-2 overflow-hidden rounded-[12px] border border-slate-200 bg-white focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-100">
        <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2" role="toolbar">
          <button
            type="button"
            className={toolbarButtonClass}
            onMouseDown={(event) => {
              event.preventDefault();
              openLinkDialog();
            }}
            aria-label="Ajouter un lien"
          >
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
          className="min-h-48 px-4 py-3 text-left text-sm leading-6 text-slate-800 outline-none [&_a]:text-sky-700 [&_a]:underline [&_a]:underline-offset-2"
        />
      </div>

      {isLinkDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeLinkDialog();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${id}-link-dialog-title`}
            className="w-full max-w-md rounded-[20px] border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id={`${id}-link-dialog-title`} className="text-lg font-bold text-slate-950">
                  Ajouter un lien
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Indiquez le texte visible et l’adresse de destination.
                </p>
              </div>
              <button
                type="button"
                onClick={closeLinkDialog}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-slate-800">
                Texte affiché
                <input
                  type="text"
                  value={linkText}
                  onChange={(event) => setLinkText(event.target.value)}
                  className="mt-2 w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  placeholder="Ex. Confidentialité"
                  autoFocus={!linkText}
                />
              </label>
              <label className="block text-sm font-semibold text-slate-800">
                Adresse du lien
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(event) => setLinkUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applyLink();
                    }
                  }}
                  className="mt-2 w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  placeholder="https://exemple.com"
                  autoFocus={Boolean(linkText)}
                />
              </label>
            </div>

            {linkError ? (
              <p className="mt-3 rounded-[10px] bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
                {linkError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeLinkDialog}
                className="rounded-[10px] border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={applyLink}
                className="rounded-[10px] bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Ajouter le lien
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
