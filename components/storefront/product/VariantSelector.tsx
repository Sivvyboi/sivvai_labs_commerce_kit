"use client";

/**
 * components/storefront/product/VariantSelector.tsx
 *
 * Client Component. Interactive variant option selector.
 * Renders option groups (Color, Size, Material, etc.) as swatches or buttons.
 * Synchronizes selected variant with the URL search param `?variant=<uuid>`.
 * Disables option combinations that don't produce an active variant.
 */

import { useMemo, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { ProductVariantRow, OptionGroupWithValues } from "@/lib/db/products";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface VariantSelectorProps {
  variants: ProductVariantRow[];
  optionGroups?: OptionGroupWithValues[];
  selectedVariant: ProductVariantRow | null;
  onSelectVariant: (variant: ProductVariantRow) => void;
  className?: string;
}

export function VariantSelector({
  variants = [],
  optionGroups = [],
  selectedVariant,
  onSelectVariant,
  className,
}: VariantSelectorProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Extract option definitions either from optionGroups or from variants' option_combination JSON
  const optionDefs = useMemo(() => {
    if (optionGroups && optionGroups.length > 0) {
      return optionGroups.map((group) => ({
        name: group.name,
        values: group.values.map((v) => ({
          label: v.label,
          swatchType: v.swatch_type,
          swatchValue: v.swatch_value,
        })),
      }));
    }

    // Fallback: derive option names and values from variants.option_combination
    const map = new Map<string, Set<string>>();
    variants.forEach((v) => {
      if (!v.option_combination || typeof v.option_combination !== "object") return;
      const combo = v.option_combination as Record<string, string>;
      Object.entries(combo).forEach(([key, val]) => {
        if (!map.has(key)) map.set(key, new Set());
        if (val) map.get(key)!.add(val);
      });
    });

    return Array.from(map.entries()).map(([name, valSet]) => ({
      name,
      values: Array.from(valSet).map((val) => ({
        label: val,
        swatchType: name.toLowerCase() === "color" ? "color" : null,
        swatchValue: null,
      })),
    }));
  }, [optionGroups, variants]);

  // Current selected option map based on selectedVariant
  const currentSelections = useMemo<Record<string, string>>(() => {
    if (!selectedVariant || !selectedVariant.option_combination) return {};
    if (typeof selectedVariant.option_combination === "object") {
      return selectedVariant.option_combination as Record<string, string>;
    }
    return {};
  }, [selectedVariant]);

  // Update URL search parameter `?variant=<uuid>` without full reload
  const updateUrlVariant = useCallback(
    (variantId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("variant", variantId);
      const newUrl = `${pathname}?${params.toString()}`;
      window.history.replaceState(null, "", newUrl);
    },
    [pathname, searchParams]
  );

  // Handle selecting an option value
  const handleSelectOption = (groupName: string, valueLabel: string) => {
    const nextSelections = { ...currentSelections, [groupName]: valueLabel };

    // Find the best matching variant for nextSelections
    const matchingVariant = variants.find((v) => {
      if (v.status !== "active") return false;
      if (!v.option_combination || typeof v.option_combination !== "object") return false;
      const combo = v.option_combination as Record<string, string>;

      // Check if all selected options match this variant's combo
      return Object.entries(nextSelections).every(([k, val]) => combo[k] === val);
    });

    // If exact match found, select it; otherwise fallback to any active variant matching the new selection
    const targetVariant =
      matchingVariant ??
      variants.find((v) => {
        if (v.status !== "active") return false;
        const combo = (v.option_combination ?? {}) as Record<string, string>;
        return combo[groupName] === valueLabel;
      });

    if (targetVariant) {
      onSelectVariant(targetVariant);
      updateUrlVariant(targetVariant.id);
    }
  };

  // Helper to check if choosing an option value would yield a valid active variant
  const isOptionValueAvailable = (groupName: string, valueLabel: string): boolean => {
    const candidateSelections = { ...currentSelections, [groupName]: valueLabel };
    return variants.some((v) => {
      if (v.status !== "active") return false;
      const combo = (v.option_combination ?? {}) as Record<string, string>;
      return Object.entries(candidateSelections).every(
        ([k, val]) => k === groupName || !combo[k] || combo[k] === val
      );
    });
  };

  if (optionDefs.length === 0 || variants.length <= 1) {
    return null;
  }

  return (
    <div className={cn("space-y-5", className)}>
      {optionDefs.map((group) => {
        const isColorGroup =
          group.name.toLowerCase() === "color" ||
          group.name.toLowerCase() === "colour";
        const selectedValue = currentSelections[group.name];

        return (
          <div key={group.name} className="space-y-2.5">
            <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-[var(--kit-text-primary)]">
              <span>{group.name}</span>
              {selectedValue && (
                <span className="font-normal text-[var(--kit-muted-fg)]">
                  {selectedValue}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={group.name}>
              {group.values.map((val) => {
                const isSelected = selectedValue === val.label;
                const isAvailable = isOptionValueAvailable(group.name, val.label);

                if (isColorGroup) {
                  // Color swatch button
                  const bgStyle = val.swatchValue ?? val.label.toLowerCase();
                  return (
                    <button
                      key={val.label}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={`${group.name}: ${val.label}`}
                      disabled={!isAvailable}
                      onClick={() => handleSelectOption(group.name, val.label)}
                      className={cn(
                        "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kit-accent)] min-h-[44px] min-w-[44px]",
                        isSelected
                          ? "border-[var(--kit-accent)] ring-2 ring-[var(--kit-accent)]/30 scale-105"
                          : "border-[var(--kit-border)] hover:border-[var(--kit-text-primary)]",
                        !isAvailable && "opacity-30 cursor-not-allowed border-dashed"
                      )}
                    >
                      <span
                        className="h-7 w-7 rounded-full shadow-inner flex items-center justify-center"
                        style={{ backgroundColor: bgStyle }}
                      >
                        {isSelected && (
                          <Check
                            className={cn(
                              "h-3.5 w-3.5",
                              ["white", "#ffffff", "yellow"].includes(bgStyle.toLowerCase())
                                ? "text-black"
                                : "text-white"
                            )}
                          />
                        )}
                      </span>
                    </button>
                  );
                }

                // Standard pill button (Size, Material, etc.)
                return (
                  <button
                    key={val.label}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`${group.name}: ${val.label}`}
                    disabled={!isAvailable}
                    onClick={() => handleSelectOption(group.name, val.label)}
                    className={cn(
                      "min-h-[44px] px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kit-accent)]",
                      isSelected
                        ? "border-[var(--kit-accent)] bg-[var(--kit-accent)] text-[var(--kit-accent-fg)] shadow-xs"
                        : "border-[var(--kit-border)] bg-[var(--kit-card)] text-[var(--kit-text-primary)] hover:border-[var(--kit-accent)] hover:bg-[var(--kit-surface)]",
                      !isAvailable && "opacity-30 cursor-not-allowed line-through bg-[var(--kit-muted)]/20"
                    )}
                  >
                    {val.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
