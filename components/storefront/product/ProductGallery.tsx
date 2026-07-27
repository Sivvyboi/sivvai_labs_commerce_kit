"use client";

/**
 * components/storefront/product/ProductGallery.tsx
 *
 * Client Component. Interactive product image gallery.
 * Supports thumbnail selection, touch swipe gestures, image counter, and optional hover zoom.
 */

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import type { ProductImageRow } from "@/lib/db/products";
import { featureFlag } from "@/config/feature-flags";
import { ChevronLeft, ChevronRight, ShoppingBag, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ProductGalleryProps {
  images: ProductImageRow[];
  productName: string;
  selectedImageId?: string | null;
  onSelectImage?: (imageId: string) => void;
  className?: string;
}

export function ProductGallery({
  images = [],
  productName,
  selectedImageId,
  onSelectImage,
  className,
}: ProductGalleryProps) {
  // Sort images by display_order, primary first
  const sortedImages = [...images].sort((a, b) => {
    if (a.is_primary) return -1;
    if (b.is_primary) return 1;
    return (a.display_order ?? 0) - (b.display_order ?? 0);
  });

  // Find index based on selectedImageId or fallback to 0
  const activeIndexFromProp = selectedImageId
    ? sortedImages.findIndex((img) => img.id === selectedImageId)
    : 0;

  const [activeIndex, setActiveIndex] = useState(
    activeIndexFromProp >= 0 ? activeIndexFromProp : 0
  );

  // Synchronize activeIndex if selectedImageId prop changes
  const effectiveIndex =
    selectedImageId && activeIndexFromProp >= 0
      ? activeIndexFromProp
      : Math.min(activeIndex, Math.max(0, sortedImages.length - 1));

  // Zoom state
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });

  // Touch swipe handling
  const touchStartX = useRef<number | null>(null);

  const handleSelect = (index: number) => {
    setActiveIndex(index);
    if (onSelectImage && sortedImages[index]) {
      onSelectImage(sortedImages[index].id);
    }
  };

  const handlePrev = () => {
    if (sortedImages.length <= 1) return;
    const nextIdx = (effectiveIndex - 1 + sortedImages.length) % sortedImages.length;
    handleSelect(nextIdx);
  };

  const handleNext = () => {
    if (sortedImages.length <= 1) return;
    const nextIdx = (effectiveIndex + 1) % sortedImages.length;
    handleSelect(nextIdx);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!featureFlag.productZoom) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  }, []);

  const activeImage = sortedImages[effectiveIndex];

  if (!sortedImages || sortedImages.length === 0) {
    return (
      <div
        className={cn(
          "relative aspect-square w-full rounded-2xl bg-[var(--kit-surface)] border border-[var(--kit-border)] flex flex-col items-center justify-center text-[var(--kit-muted-fg)]",
          className
        )}
      >
        <ShoppingBag className="h-12 w-12 opacity-30" />
        <span className="text-xs mt-2 opacity-60">No image available</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Main Image Display */}
      <div
        className="group relative aspect-square w-full rounded-2xl bg-[var(--kit-surface)] border border-[var(--kit-border)] overflow-hidden shadow-xs select-none"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => featureFlag.productZoom && setIsZoomed(true)}
        onMouseLeave={() => featureFlag.productZoom && setIsZoomed(false)}
        onMouseMove={handleMouseMove}
      >
        {activeImage?.url ? (
          <Image
            src={activeImage.url}
            alt={activeImage.alt_text ?? `${productName} - Image ${effectiveIndex + 1}`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
            className={cn(
              "object-cover object-center transition-transform duration-300",
              isZoomed && featureFlag.productZoom && "opacity-0"
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[var(--kit-muted-fg)]">
            <ShoppingBag className="h-10 w-10 opacity-30" />
          </div>
        )}

        {/* Hover Zoom Overlay */}
        {featureFlag.productZoom && isZoomed && activeImage?.url && (
          <div
            className="absolute inset-0 bg-no-repeat pointer-events-none transition-opacity duration-150"
            style={{
              backgroundImage: `url(${activeImage.url})`,
              backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
              backgroundSize: "200%",
            }}
          />
        )}

        {/* Zoom Indicator Badge */}
        {featureFlag.productZoom && (
          <div className="absolute top-3 right-3 z-10 hidden sm:flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-md px-2.5 py-1 text-[10px] font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity">
            <ZoomIn className="h-3 w-3" />
            <span>Hover to zoom</span>
          </div>
        )}

        {/* Prev / Next Arrows */}
        {sortedImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 min-h-[44px] min-w-[44px]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-all opacity-80 sm:opacity-0 group-hover:opacity-100 min-h-[44px] min-w-[44px]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Image Counter Badge */}
        {sortedImages.length > 1 && (
          <div className="absolute bottom-3 left-3 z-10 rounded-full bg-black/50 backdrop-blur-md px-2.5 py-1 text-[11px] font-medium text-white">
            {effectiveIndex + 1} / {sortedImages.length}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {sortedImages.length > 1 && (
        <div
          className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none"
          role="region"
          aria-label="Product thumbnail list"
        >
          {sortedImages.map((img, idx) => {
            const isSelected = idx === effectiveIndex;
            return (
              <button
                key={img.id || idx}
                type="button"
                onClick={() => handleSelect(idx)}
                aria-label={`View image ${idx + 1}`}
                aria-current={isSelected ? "true" : undefined}
                className={cn(
                  "relative h-16 w-16 sm:h-20 sm:w-20 rounded-xl overflow-hidden border-2 bg-[var(--kit-surface)] shrink-0 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kit-accent)] min-h-[44px] min-w-[44px]",
                  isSelected
                    ? "border-[var(--kit-accent)] shadow-xs opacity-100 scale-95"
                    : "border-transparent opacity-60 hover:opacity-100 hover:border-[var(--kit-border)]"
                )}
              >
                {img.url ? (
                  <Image
                    src={img.url}
                    alt={img.alt_text ?? `${productName} thumbnail ${idx + 1}`}
                    fill
                    sizes="80px"
                    className="object-cover object-center"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-[var(--kit-muted-fg)]">
                    {idx + 1}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
