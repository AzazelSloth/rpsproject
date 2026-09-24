"use client";

import { useEffect, useRef, useState } from "react";
import sanitizeHtml from "sanitize-html";
import { LinkedSurveyText } from "@/components/rps/linked-survey-text";

const RICH_TEXT_MARKER = "<!--rps-rich-text-->";

// Use the same typography in the editor, preview and participant questionnaire.
// Empty blocks are intentional blank lines; don't add spacing between blocks.
const SURVEY_TEXT_CLASS_NAME =
  "whitespace-pre-wrap break-words [&_p]:m-0 [&_p]:min-h-[1lh] [&_div]:m-0 [&_div]:min-h-[1lh] [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-accent [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6";

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  // Browsers insert divs as well as paragraphs when pressing Enter.
  allowedTags: ["p", "div", "br", "ul", "ol", "li", "strong", "em", "u", "a"],
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
  return escapeHtml(value).replace(/\r\n?/g, "\n").replaceAll("\n", "<br>");
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
      <div className={`${SURVEY_TEXT_CLASS_NAME} ${className}`}>
        <LinkedSurveyText text={text} />
      </div>
    );
  }

  return (
    <div
      className={`${SURVEY_TEXT_CLASS_NAME} ${className}`}
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

  function runCommand(command: "bold" | "insertUnorderedList") {
    editorRef.current?.focus();
    document.execCommand(command);
    publishEditorValue();
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
  function insertClipboardContent(data: DataTransfer) {
    const html = data.getData("text/html");
    if (html) {
      // Preserve supported formatting while removing scripts, styles and handlers
      // before the clipboard HTML ever reaches the editable DOM.
      document.execCommand("insertHTML", false, sanitizeSurveyHtml(html));
    } else {
      document.execCommand("insertText", false, data.getData("text/plain"));
    }
    publishEditorValue();
  }

  const toolbarButtonClass =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-md border border-line bg-white px-3 text-xs font-semibold text-graphite hover:bg-page";

  return (
    <>
      <div className="mt-2 overflow-hidden rounded-[12px] border border-line bg-white focus-within:border-accent-bright focus-within:ring-2 focus-within:ring-line">
        <div className="flex flex-wrap gap-1 border-b border-line bg-page p-2" role="toolbar">
          <button
            type="button"
            className={toolbarButtonClass}
            onMouseDown={(event) => {
              event.preventDefault();
              runCommand("bold");
            }}
            aria-label="Mettre en gras"
            title="Gras"
          >
            B
          </button>
          <button
            type="button"
            className={toolbarButtonClass}
            onMouseDown={(event) => {
              event.preventDefault();
              runCommand("insertUnorderedList");
            }}
            aria-label="Créer une liste à puces"
            title="Liste à puces"
          >
            • Liste
          </button>
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
            insertClipboardContent(event.clipboardData);
          }}
          onDrop={(event) => {
            event.preventDefault();
            insertClipboardContent(event.dataTransfer);
          }}
          className={`${SURVEY_TEXT_CLASS_NAME} min-h-48 px-4 py-3 text-left text-sm leading-7 text-graphite outline-none`}
        />
      </div>

      {isLinkDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-graphite/55 px-4 py-6"
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
            className="w-full max-w-md rounded-[20px] border border-line bg-white p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id={`${id}-link-dialog-title`} className="text-lg font-bold text-graphite">
                  Ajouter un lien
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Indiquez le texte visible et l’adresse de destination.
                </p>
              </div>
              <button
                type="button"
                onClick={closeLinkDialog}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-muted hover:bg-page hover:text-graphite"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-graphite">
                Texte affiché
                <input
                  type="text"
                  value={linkText}
                  onChange={(event) => setLinkText(event.target.value)}
                  className="mt-2 w-full rounded-[10px] border border-line bg-white px-3 py-2.5 text-sm font-normal text-graphite outline-none focus:border-accent-bright focus:ring-2 focus:ring-line"
                  placeholder="Ex. Confidentialité"
                  autoFocus={!linkText}
                />
              </label>
              <label className="block text-sm font-semibold text-graphite">
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
                  className="mt-2 w-full rounded-[10px] border border-line bg-white px-3 py-2.5 text-sm font-normal text-graphite outline-none focus:border-accent-bright focus:ring-2 focus:ring-line"
                  placeholder="https://exemple.com"
                  autoFocus={Boolean(linkText)}
                />
              </label>
            </div>

            {linkError ? (
              <p className="mt-3 rounded-[10px] bg-page px-3 py-2 text-sm font-medium text-graphite" role="alert">
                {linkError}
              </p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeLinkDialog}
                className="rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm font-semibold text-graphite hover:bg-page"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={applyLink}
                className="rounded-[10px] bg-graphite px-4 py-2.5 text-sm font-semibold text-white hover:bg-graphite"
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
