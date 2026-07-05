"use client";

import React, { useState } from "react";

interface PhotoCarouselProps {
  photos: string[];
}

export function PhotoCarousel({ photos }: PhotoCarouselProps) {
  const [current, setCurrent] = useState(0);

  if (!photos || photos.length === 0) return null;

  const prev = () => setCurrent((c) => (c - 1 + photos.length) % photos.length);
  const next = () => setCurrent((c) => (c + 1) % photos.length);

  return (
    <div className="mt-6">
      <h2 className="font-semibold text-primary text-sm mb-3 uppercase tracking-wider">
        Intake Photos
      </h2>
      <div className="relative rounded-2xl overflow-hidden select-none">
        <div className="relative w-full aspect-video overflow-hidden bg-zinc-100 rounded-2xl">
          <img
            src={photos[current]}
            alt={"Photo " + String(current + 1)}
            className="w-full h-full object-contain transition-all duration-300"
          />
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
            {String(current + 1)} / {String(photos.length)}
          </div>
        </div>
        {photos.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm border border-black/10 flex items-center justify-center shadow-md hover:bg-white transition-all z-10"
            >
              <span className="material-symbols-outlined text-xl text-primary">chevron_left</span>
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm border border-black/10 flex items-center justify-center shadow-md hover:bg-white transition-all z-10"
            >
              <span className="material-symbols-outlined text-xl text-primary">chevron_right</span>
            </button>
          </>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 mt-3 justify-center flex-wrap">
          {photos.map((url, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={"w-12 h-12 rounded-lg overflow-hidden border-2 transition-all " + (idx === current ? "border-[#4e342e] shadow-md" : "border-transparent opacity-60")}
            >
              <img src={url} alt={"thumb " + String(idx + 1)} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}