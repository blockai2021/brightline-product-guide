import { createQrArtifacts } from "./digital-link-qr";
import { pdfSampleRows, type PrintJob } from "./printing";

export async function createPrintPreview(job: PrintJob, count: number) {
  const rows = pdfSampleRows(job, count);
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ format: "a4", unit: "mm" });
  pdf.setProperties({
    title: `DEMO label preview ${job.id}`,
    subject: "Preview only — not production labels",
  });
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    if (i > 0 && i % 8 === 0) pdf.addPage();
    if (i % 8 === 0) {
      pdf.setFontSize(10);
      pdf.text("Product iCode Connect | DEMO / PREVIEW ONLY", 12, 12);
      pdf.setFontSize(7);
      pdf.text(
        "Never print .example test codes on commercial packaging. Barcode quality is not certified.",
        12,
        18,
      );
    }
    const x = 12 + (i % 2) * 94;
    const y = 25 + Math.floor((i % 8) / 2) * 65;
    const qr = await createQrArtifacts(row.digitalLink);
    pdf.rect(x, y, 90, 61);
    pdf.addImage(qr.png, "PNG", x + 2, y + 4, 38, 38);
    pdf.setFontSize(7);
    pdf.text("DEMO / PREVIEW ONLY", x + 41, y + 9);
    pdf.text(`GTIN: ${row.gtin}`, x + 41, y + 17);
    pdf.text(`Serial: ${row.serial}`, x + 41, y + 25, { maxWidth: 46 });
    pdf.text(`Sequence: ${row.sequence}`, x + 41, y + 38);
    pdf.setFontSize(5);
    pdf.text(job.id, x + 3, y + 48);
    pdf.text(row.digitalLink, x + 3, y + 53, { maxWidth: 84 });
  }
  return pdf.output("blob");
}
