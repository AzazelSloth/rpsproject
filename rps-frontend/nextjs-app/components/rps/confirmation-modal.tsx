"use client";

import type { ReactNode } from "react";

export function ConfirmationModal({
  open,
  eyebrow = "Confirmation",
  title,
  children,
  confirmLabel,
  pendingLabel = "Traitement...",
  pending = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-graphite/55 px-4 py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) {
          onCancel();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        className="w-full max-w-lg overflow-hidden rounded-[24px] border border-line bg-surface shadow-2xl"
      >
        <div className="border-b border-line px-6 py-5 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            {eyebrow}
          </p>
          <h2
            id="confirmation-modal-title"
            className="mt-2 font-heading text-2xl font-bold text-graphite"
          >
            {title}
          </h2>
        </div>
        <div className="px-6 py-6 text-sm leading-7 text-muted sm:px-8">
          {children}
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-line bg-white px-6 py-5 sm:flex-row sm:justify-end sm:px-8">
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-[12px] border border-line bg-white px-5 py-3 text-sm font-semibold text-graphite transition hover:bg-page disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-track disabled:text-muted"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="inline-flex items-center justify-center rounded-[12px] bg-graphite px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(31,37,40,0.18)] transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-100 disabled:bg-track disabled:text-muted"
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
