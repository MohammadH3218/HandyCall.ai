'use client';

export type UploadedImagePayload = {
  url: string;
  width: number;
  height: number;
  mime_type: string;
  name?: string;
  is_video?: boolean;
};

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo']);

/** Max file sizes before upload: 25 MB images, 100 MB videos */
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image.'));
    image.src = src;
  });
}

async function uploadToS3ViaPresign(
  file: File,
  mimeType: string,
): Promise<{ url: string }> {
  // Get presigned URL from our backend
  const resp = await fetch('/api/portal-messaging/media/presign', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content_type: mimeType, file_name: file.name }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error((err as any).message || 'Failed to get upload URL');
  }
  const { upload_url, public_url } = await resp.json() as {
    upload_url: string;
    public_url: string;
  };

  // Upload directly to S3
  const put = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: file,
  });
  if (!put.ok) throw new Error('Failed to upload file to storage');

  return { url: public_url };
}

export async function optimizeImageFile(
  file: File,
  options?: { maxLongEdge?: number; quality?: number },
): Promise<UploadedImagePayload> {
  const isVideo = VIDEO_TYPES.has(file.type);

  if (isVideo) {
    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error(`Video is too large. Maximum size is ${MAX_VIDEO_BYTES / 1024 / 1024} MB.`);
    }
    const { url } = await uploadToS3ViaPresign(file, file.type);
    return { url, width: 0, height: 0, mime_type: file.type, name: file.name, is_video: true };
  }

  if (!IMAGE_TYPES.has(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(`Image is too large. Maximum size is ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`);
  }

  // Compress image on canvas, then upload the blob to S3
  const maxLongEdge = options?.maxLongEdge ?? 1600;
  const quality = options?.quality ?? 0.88;

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Failed to read file.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(file);
  });

  const image = await loadImage(dataUrl);
  const longestSide = Math.max(image.width, image.height);
  const scale = longestSide > maxLongEdge ? maxLongEdge / longestSide : 1;
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, width, height);

  const mimeType = file.type === 'image/png' || file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed'))), mimeType, quality),
  );

  const optimizedFile = new File([blob], file.name, { type: mimeType });
  const { url } = await uploadToS3ViaPresign(optimizedFile, mimeType);

  return { url, width, height, mime_type: mimeType, name: file.name };
}
