import { apiClient } from "@/lib/api/client";

export interface GovtFpoSummaryReportParams {
  file_format?: "excel" | "pdf";
  status?: string;
  tier?: string;
  from_date?: string;
  to_date?: string;
}

export const govtReportsApi = {
  downloadFpoSummary: async (params: GovtFpoSummaryReportParams = {}): Promise<void> => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== "" && v !== undefined),
    );
    const response = await apiClient.get("/government/reports/fpo-summary/", {
      params: cleanParams,
      responseType: "blob",
    });
    const disposition = response.headers["content-disposition"] as string | undefined;
    const ext = params.file_format === "pdf" ? "pdf" : "xlsx";
    const filename = disposition?.match(/filename="?([^"]+)"?/)?.[1] ?? `fpo-summary.${ext}`;
    const blob = response.data instanceof Blob ? response.data : new Blob([response.data as BlobPart]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 150);
  },
};
