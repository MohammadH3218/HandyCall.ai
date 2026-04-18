'use client';

import { useEffect, useState } from 'react';
import { IconChevronLeft, IconChevronRight, IconX } from '@tabler/icons-react';

export type LightboxImage = {
  src: string;
  alt?: string;
};

export function ImageLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: LightboxImage[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(initialIndex);
  const hasMultiple = images.length > 1;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && hasMultiple) {
        setCurrent((value) => (value - 1 + images.length) % images.length);
      }
      if (event.key === 'ArrowRight' && hasMultiple) {
        setCurrent((value) => (value + 1) % images.length);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [hasMultiple, images.length, onClose]);

  const activeImage = images[current];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/72 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-5 top-5 rounded-full bg-white/90 p-2 text-slate-700 shadow-lg transition hover:bg-white"
        aria-label="Close image viewer"
      >
        <IconX className="h-6 w-6" stroke={1.6} />
      </button>

      <div
        className="flex w-full max-w-6xl items-center justify-center gap-3"
        onClick={(event) => event.stopPropagation()}
      >
        {hasMultiple ? (
          <button
            onClick={() => setCurrent((value) => (value - 1 + images.length) % images.length)}
            className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-xl transition hover:bg-slate-100 lg:flex"
            aria-label="Previous image"
          >
            <IconChevronLeft className="h-7 w-7" stroke={1.8} />
          </button>
        ) : null}

        <div className="w-full overflow-hidden rounded-[28px] bg-white p-3 shadow-2xl">
          <div className="relative flex min-h-[60vh] items-center justify-center rounded-[22px] bg-slate-100">
            <img
              src={activeImage.src}
              alt={activeImage.alt || `Image ${current + 1}`}
              className="max-h-[80vh] w-full rounded-[22px] object-contain"
            />
          </div>

          <div className="flex flex-col gap-3 px-2 pb-1 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-medium text-slate-700">
              Image {current + 1} of {images.length}
            </p>

            {hasMultiple ? (
              <div className="flex flex-wrap gap-1.5">
                {images.slice(0, 10).map((image, index) => (
                  <button
                    key={`${image.src}-${index}`}
                    onClick={() => setCurrent(index)}
                    className={`h-12 w-12 overflow-hidden rounded-xl border transition ${
                      index === current ? 'border-slate-900' : 'border-slate-200'
                    }`}
                    aria-label={`View image ${index + 1}`}
                  >
                    <img src={image.src} alt={image.alt || `Thumbnail ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {hasMultiple ? (
          <button
            onClick={() => setCurrent((value) => (value + 1) % images.length)}
            className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-xl transition hover:bg-slate-100 lg:flex"
            aria-label="Next image"
          >
            <IconChevronRight className="h-7 w-7" stroke={1.8} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
