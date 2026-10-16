export type Format = 'image/jpeg' | 'image/png' | 'image/webp';
export const MAX_BYTES = 25 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;
const MAX_EDGE = 16_384;
export const extensions: Record<Format, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export type Decoded = { source: CanvasImageSource; width: number; height: number; close: () => void };

export function bytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
}

export async function validate(file: File): Promise<void> {
  if (!file.size) throw new Error('This file is empty. Please choose an image with content.');
  if (file.size > MAX_BYTES) throw new Error('This image exceeds the 25 MB limit. Please choose a smaller file.');
  const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v);
  const jpg = b[0] === 255 && b[1] === 216 && b[2] === 255;
  const webp = String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP';
  if (!png && !jpg && !webp) throw new Error('Unsupported file. Choose a PNG, JPEG, or WebP image.');
}

export async function decode(blob: Blob): Promise<Decoded> {
  let decoded: Decoded;
  try {
    const bitmap = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    decoded = { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      decoded = { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => { img.src = ''; } };
    } catch {
      throw new Error('This image could not be decoded. It may be damaged or unsupported by your browser.');
    } finally { URL.revokeObjectURL(url); }
  }
  if (!decoded.width || !decoded.height || decoded.width * decoded.height > MAX_PIXELS || Math.max(decoded.width, decoded.height) > MAX_EDGE) {
    decoded.close();
    throw new Error('This image is too large to process safely. Use an image under 40 megapixels and 16,384 pixels per side.');
  }
  return decoded;
}

export async function convert(file: File, format: Format, quality: number, maxWidth?: number) {
  const decoded = await decode(file);
  const canvas = document.createElement('canvas');
  try {
    const scale = maxWidth ? Math.min(1, maxWidth / decoded.width) : 1;
    canvas.width = Math.max(1, Math.round(decoded.width * scale));
    canvas.height = Math.max(1, Math.round(decoded.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas is unavailable. Try a current browser with Canvas support.');
    if (format === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => result?.size ? resolve(result) : reject(new Error('Canvas could not export this image. Try a smaller width.')), format, quality / 100);
    });
    if (blob.type !== format) throw new Error('Your browser does not support exporting this format. Try PNG or JPEG.');
    return { blob, width: canvas.width, height: canvas.height };
  } finally { decoded.close(); canvas.width = 0; canvas.height = 0; }
}
