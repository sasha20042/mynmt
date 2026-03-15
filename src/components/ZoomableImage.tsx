"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";

interface ZoomableImageProps {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Контейнер для превʼю (наприклад rounded-xl overflow-hidden) */
  containerClassName?: string;
}

export function ZoomableImage({
  src,
  alt = "",
  className = "",
  style,
  containerClassName = "",
}: ZoomableImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={`relative inline-block ${containerClassName}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={className}
          style={style}
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-white/90 hover:bg-white border border-slate-200 shadow-sm text-slate-600 hover:text-indigo-600 transition"
          aria-label="Збільшити зображення"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Збільшене зображення"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/90 hover:bg-white text-slate-700"
            aria-label="Закрити"
          >
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
