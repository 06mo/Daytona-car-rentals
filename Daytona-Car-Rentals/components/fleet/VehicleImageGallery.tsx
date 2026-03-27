"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { resolveVehicleImageUrl } from "@/lib/utils/storage";

type VehicleImageGalleryProps = {
  images: string[];
  make: string;
  model: string;
};

export function VehicleImageGallery({ images, make, model }: VehicleImageGalleryProps) {
  const galleryImages = images.length > 0 ? images : ["/images/vehicle-sedan.svg"];
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <div className="space-y-4">
      <div className="relative aspect-video overflow-hidden rounded-[2rem] bg-slate-200">
        <Image
          alt={`${make} ${model}`}
          className="object-cover"
          fill
          priority
          src={resolveVehicleImageUrl(galleryImages[activeIndex])}
        />
      </div>

      {galleryImages.length > 1 ? (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {galleryImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              className={cn(
                "relative h-20 w-28 shrink-0 overflow-hidden rounded-2xl border-2 border-transparent",
                activeIndex === index ? "border-orange-500" : "border-transparent",
              )}
              onClick={() => setActiveIndex(index)}
              type="button"
            >
              <Image alt={`${make} ${model} thumbnail ${index + 1}`} className="object-cover" fill src={resolveVehicleImageUrl(image)} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
