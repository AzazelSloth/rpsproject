"use client";

import { appFetch } from "@/lib/api";
import { PrimaryButton } from "@/components/rps/ui";
import { useState } from "react";

export default function DownloadReportButton({ href }: { href: string }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await appFetch(href);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition");
      const fileName = extractFileName(disposition) ?? "rapport-rps.docx";
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download report:", err);
      // Ouvre le document dans un nouvel onglet en secours.
      window.open(href, "_blank");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PrimaryButton disabled={loading} onClick={handleDownload}>
      {loading ? "Generation..." : "Telecharger le rapport Word"}
    </PrimaryButton>
  );
}

function extractFileName(disposition: string | null) {
  if (!disposition) {
    return null;
  }

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const basicMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
  return basicMatch?.[1] ?? null;
}
