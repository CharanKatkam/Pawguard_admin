import api from "../api/axios";

const triggerDownload = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const reportsService = {
  // Export Executive PDF report
  exportExecutivePdf: async (): Promise<boolean> => {
    try {
      const response = await api.get("/reports/executive/pdf", { responseType: "blob" });
      if (!(response.data instanceof Blob)) {
        throw new Error("Report endpoint did not return a valid file.");
      }
      triggerDownload(
        new Blob([response.data], { type: "application/pdf" }),
        `PawGuard_Executive_Report_${Date.now()}.pdf`
      );
      return true;
    } catch (err) {
      const detail =
        (err as any)?.response?.data?.detail ||
        (err as any)?.response?.data?.message ||
        (err instanceof Error ? err.message : "Report export failed.");
      throw new Error(detail);
    }
  },

  // Export CSV Data Dump
  exportCsvDump: async (): Promise<boolean> => {
    try {
      const response = await api.get("/reports/csv", { responseType: "blob" });
      if (!(response.data instanceof Blob)) {
        throw new Error("Report endpoint did not return a valid file.");
      }
      triggerDownload(
        new Blob([response.data], { type: "text/csv" }),
        `PawGuard_Data_Dump_${Date.now()}.csv`
      );
      return true;
    } catch (err) {
      const detail =
        (err as any)?.response?.data?.detail ||
        (err as any)?.response?.data?.message ||
        (err instanceof Error ? err.message : "CSV export failed.");
      throw new Error(detail);
    }
  },
};

export default reportsService;
