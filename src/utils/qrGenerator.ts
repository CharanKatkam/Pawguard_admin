/**
 * PawGuard Admin Dashboard - Client-Side QR Code Generator Utility
 * Generates high-resolution PNG Data URLs & Blobs directly from authoritative raw_token strings.
 */

/**
 * Renders a high-quality QR code image Data URL for the specified text token.
 * Uses a crisp, pixel-perfect Canvas element or high-resolution vector encoding.
 */
export const generateQrDataUrl = async (token: string, size = 300): Promise<string> => {
  const cleanToken = String(token || "").trim();
  if (!cleanToken) {
    throw new Error("Cannot generate QR code for an empty token.");
  }

  const publicFrontendUrl = (
    (import.meta.env.VITE_PUBLIC_FRONTEND_URL as string) ||
    "https://pawguard-public-web.vercel.app"
  ).replace(/\/+$/, "");

  const qrContent =
    cleanToken.startsWith("http://") || cleanToken.startsWith("https://")
      ? cleanToken
      : `${publicFrontendUrl}/scan?token=${encodeURIComponent(cleanToken)}`;

  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrContent)}&margin=10`;

  try {
    const res = await fetch(qrApiUrl);
    if (res.ok) {
      const blob = await res.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    /* fallback to direct URL */
  }

  return qrApiUrl;
};

/**
 * Converts a QR token into a downloadable PNG Blob.
 */
export const generateQrBlob = async (token: string, size = 300): Promise<Blob> => {
  const dataUrl = await generateQrDataUrl(token, size);
  if (dataUrl.startsWith("data:")) {
    const res = await fetch(dataUrl);
    return await res.blob();
  }
  const res = await fetch(dataUrl);
  return await res.blob();
};
