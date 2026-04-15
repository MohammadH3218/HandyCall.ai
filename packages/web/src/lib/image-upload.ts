'use client';

export type UploadedImagePayload = {
  url: string;
  width: number;
  height: number;
  mime_type: string;
  name?: string;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image.'));
    image.src = src;
  });
}

function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
) {
  try {
    return canvas.toDataURL(mimeType, quality);
  } catch {
    return canvas.toDataURL('image/jpeg', quality);
  }
}

export async function optimizeImageFile(
  file: File,
  options?: {
    maxLongEdge?: number;
    quality?: number;
  }
): Promise<UploadedImagePayload> {
  const maxLongEdge = options?.maxLongEdge ?? 1800;
  const quality = options?.quality ?? 0.9;
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);

  const longestSide = Math.max(image.width, image.height);
  const scale = longestSide > maxLongEdge ? maxLongEdge / longestSide : 1;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Image canvas is unavailable.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, width, height);

  const hasAlpha = file.type === 'image/png' || file.type === 'image/webp';
  const preferredMimeType = hasAlpha ? 'image/webp' : 'image/jpeg';
  const url = canvasToDataUrl(canvas, preferredMimeType, quality);

  return {
    url,
    width,
    height,
    mime_type: preferredMimeType,
    name: file.name,
  };
}
