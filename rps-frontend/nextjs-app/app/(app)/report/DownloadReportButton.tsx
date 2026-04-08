"use client";

import { PrimaryButton } from "@/components/rps/ui";
import { useState } from "react";

export default function DownloadReportButton({ href }: { href: string }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = href.split("/").pop() || "report.docx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download report:", err);
      // Fallback: open in new tab
      window.open(href, "_blank");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PrimaryButton disabled={loading} onClick={handleDownload}>
      {loading ? "Generation..." : "Telecharger Word"}
    </PrimaryButton>
  );
}
