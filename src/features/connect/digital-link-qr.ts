import QRCode from "qrcode";

export async function createQrArtifacts(absoluteUri: string) {
  const uri = new URL(absoluteUri);
  if (uri.protocol !== "https:") throw new Error("QR content must be an HTTPS URI");
  const options = { errorCorrectionLevel: "M" as const, margin: 2, width: 320 };
  const [pngDataUrl, svg] = await Promise.all([
    QRCode.toDataURL(uri.toString(), { ...options, type: "image/png" }),
    QRCode.toString(uri.toString(), { ...options, type: "svg" }),
  ]);
  return { content: uri.toString(), pngDataUrl, svg };
}

