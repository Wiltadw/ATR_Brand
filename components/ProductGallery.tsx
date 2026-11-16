"use client";

import { useState } from "react";

export function ProductGallery({ images, name }: { images: { id: number; url: string; alt: string | null }[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[Math.min(active, images.length - 1)];

  return (
    <div>
      <div className="bottle-halo relative aspect-[4/5] overflow-hidden rounded-3xl border border-line">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.url} alt={current.alt || name} width={900} height={1125} className="h-full w-full object-contain p-8 md:p-12" fetchPriority="high" />
        ) : (
          <div className="grid h-full place-items-center text-dim">بدون تصویر</div>
        )}
      </div>
      {images.length > 1 && (
        <ul className="mt-3 flex gap-2.5" aria-label="تصاویر محصول">
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`نمایش تصویر ${i + 1}`}
                aria-current={i === active}
                className={`bottle-halo h-20 w-16 overflow-hidden rounded-xl border transition-colors ${i === active ? "border-neon" : "border-line hover:border-neon-soft"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" width={64} height={80} className="h-full w-full object-contain p-1.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
