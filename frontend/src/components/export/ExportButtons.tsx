"use client";

import { useState } from "react";
import { api } from "@/services/api";
import type { ExportRequest } from "@/types/trip";

interface Props {
  exportRequest: ExportRequest;
}

export function ExportButtons({ exportRequest }: Props) {
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
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(`PDF export failed: ${e}`);
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
      setError(`JSON export failed: ${e}`);
    } finally {
      setLoadingJson(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={handlePDF}
          disabled={loadingPdf}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loadingPdf ? (
            <><span className="animate-spin">⟳</span> Generating PDF…</>
          ) : (
            <>📄 Download PDF</>
          )}
        </button>
        <button
          onClick={handleJSON}
          disabled={loadingJson}
          className="flex-1 bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loadingJson ? (
            <><span className="animate-spin">⟳</span> Exporting…</>
          ) : (
            <>{ "{}" } Download JSON</>
          )}
        </button>
      </div>
      <p className="text-xs text-gray-400 text-center">
        PDF is polished and print-ready · JSON can be re-imported in a future session
      </p>
    </div>
  );
}
