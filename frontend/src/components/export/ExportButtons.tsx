"use client";

import { useState } from "react";
import { api } from "@/services/api";
import type { ExportRequest } from "@/types/trip";
import { Button } from "@/components/ui/Button";
import { Download, FileJson, AlertTriangle } from "lucide-react";

interface Props {
  exportRequest: ExportRequest;
  disabled?: boolean;
}

export function ExportButtons({ exportRequest, disabled }: Props) {
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loadingJson, setLoadingJson] = useState(false);
  const [error, setError] = useState("");

  async function handlePDF() {
    setLoadingPdf(true);
    setError("");
    try {
      const blob = await api.exportPDF(exportRequest);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "travel-plan.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e) {
      setError(e instanceof Error ? e.message : `PDF export failed: ${e}`);
    } finally {
      setLoadingPdf(false);
    }
  }

  async function handleJSON() {
    setLoadingJson(true);
    setError("");
    try {
      const data = await api.exportJSON(exportRequest);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "travel-plan.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : `JSON export failed: ${e}`);
    } finally {
      setLoadingJson(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p
          className="text-sm rounded-lg px-3 py-2 flex items-center gap-2 font-body"
          style={{
            color: "var(--accent)",
            background: "rgba(224,122,95,0.10)",
            border: "1px solid rgba(224,122,95,0.25)",
          }}
        >
          <AlertTriangle size={14} className="shrink-0" />
          {error}
        </p>
      )}
      <div className="flex gap-3">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handlePDF}
          loading={loadingPdf}
          disabled={disabled || loadingPdf}
          icon={<Download size={15} />}
        >
          {loadingPdf ? "Generating PDF…" : "Download PDF"}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          onClick={handleJSON}
          loading={loadingJson}
          disabled={disabled || loadingJson}
          icon={<FileJson size={15} />}
        >
          {loadingJson ? "Exporting…" : "Download JSON"}
        </Button>
      </div>
      <p className="text-xs text-center font-body" style={{ color: "var(--text-subtle)" }}>
        PDF is polished and print-ready · JSON can be re-imported in a future session
      </p>
    </div>
  );
}
