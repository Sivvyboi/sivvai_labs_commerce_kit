"use client";

/**
 * components/storefront/product/VariantSelector.tsx
 *
 * Client Component. Interactive variant option selector.
 * Renders option groups (Color, Size, Material, etc.) as swatches or buttons.
 * Uses deterministic combination resolver (Phase 5) and availability matrix (Phase 6).
 * Synchronizes selected variant with the URL search param `?variant=<uuid>`.
 * Disables option combinations that don't produce an active variant (zero fallback).
 */

import { useState, useMemo, useCallback, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { ProductVariantRow, OptionGroupWithValues } from "@/lib/db/products";
import {
  resolveVariantByCombination,
  buildVariantAvailabilityMatrix,
  normalizeOptionCombination,
  type OptionCombination,
  type VariantAvailabilityStatus,
} from "@/lib/variants/combination";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface VariantSelectorProps {
  variants: ProductVariantRow[];
  optionGroups?: OptionGroupWithValues[];
  selectedVariant: ProductVariantRow | null;
  onSelectVariant: (variant: ProductVariantRow | null) => void;
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

  // Track internal selections so partial or unconfigured state is preserved across clicks
  const [internalSelections, setInternalSelections] = useState<OptionCombination>(() => {
    if (selectedVariant?.option_combination && typeof selectedVariant.option_combination === "object") {
      return normalizeOptionCombination(selectedVariant.option_combination as OptionCombination);
    }
    return {};
  });

  // Keep internalSelections in sync if selectedVariant is updated from parent / URL
  useEffect(() => {
    if (selectedVariant?.option_combination && typeof selectedVariant.option_combination === "object") {
      setInternalSelections(
        normalizeOptionCombination(selectedVariant.option_combination as OptionCombination)
      );
    }
  }, [selectedVariant]);

  // Update URL search parameter `?variant=<uuid>` without full reload
  const updateUrlVariant = useCallback(
    (variantId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (variantId) {
        params.set("variant", variantId);
      } else {
        params.delete("variant");
      }
      const queryString = params.toString();
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname;
      window.history.replaceState(null, "", newUrl);
    },
    [pathname, searchParams]
  );

  // Compute availability matrix for all groups and values given current selections
  const availabilityMatrix = useMemo(() => {
    return buildVariantAvailabilityMatrix(variants, optionDefs, internalSelections);
  }, [variants, optionDefs, internalSelections]);

  // Handle selecting an option value
  const handleSelectOption = (groupName: string, valueLabel: string) => {
    const matrixEntry = availabilityMatrix[groupName]?.[valueLabel];
    if (matrixEntry?.status === "UNAVAILABLE") {
      // Guard: do not allow selecting completely unconfigured/missing combination
      return;
    }

    const nextSelections = normalizeOptionCombination({
      ...internalSelections,
      [groupName]: valueLabel,
    });
    setInternalSelections(nextSelections);

    const allGroupNames = optionDefs.map((d) => d.name);
    // Deterministic resolver (Phase 5): strictly exact match or null
    const targetVariant = resolveVariantByCombination(variants, nextSelections, allGroupNames);

    if (targetVariant) {
      onSelectVariant(targetVariant);
      updateUrlVariant(targetVariant.id);
    } else {
      // Incomplete or non-existent combination (Zero fallback!)
      onSelectVariant(null);
      updateUrlVariant(null);
    }
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
        const selectedValue = internalSelections[group.name];

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
                const matrixStatus: VariantAvailabilityStatus =
                  availabilityMatrix[group.name]?.[val.label]?.status ?? "UNAVAILABLE";
                const isAvailable = matrixStatus === "AVAILABLE";
                const isOutOfStock = matrixStatus === "OUT_OF_STOCK";
                const isUnavailable = matrixStatus === "UNAVAILABLE";

                const accessibleLabel = `${group.name}: ${val.label}${
                  isOutOfStock ? " (Out of stock)" : isUnavailable ? " (Unavailable)" : ""
                }`;

                if (isColorGroup) {
                  // Color swatch button
                  const bgStyle = val.swatchValue ?? val.label.toLowerCase();
                  return (
                    <button
                      key={val.label}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={accessibleLabel}
                      aria-disabled={isUnavailable}
                      disabled={isUnavailable}
                      onClick={() => handleSelectOption(group.name, val.label)}
                      title={accessibleLabel}
                      className={cn(
                        "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kit-accent)] min-h-[44px] min-w-[44px]",
                        isSelected
                          ? "border-[var(--kit-accent)] ring-2 ring-[var(--kit-accent)]/30 scale-105"
                          : "border-[var(--kit-border)] hover:border-[var(--kit-text-primary)]",
                        isOutOfStock && !isSelected && "opacity-75 border-dashed",
                        isUnavailable && "opacity-25 cursor-not-allowed border-dashed bg-transparent"
                      )}
                    >
                      <span
                        className="h-7 w-7 rounded-full shadow-inner flex items-center justify-center relative overflow-hidden"
                        style={{ backgroundColor: bgStyle }}
                      >
                        {isSelected && (
                          <Check
                            className={cn(
                              "h-3.5 w-3.5 z-10",
                              ["white", "#ffffff", "yellow"].includes(bgStyle.toLowerCase())
                                ? "text-black"
                                : "text-white"
                            )}
                          />
                        )}
                        {/* Diagonal slash across out-of-stock swatches */}
                        {isOutOfStock && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="w-full h-0.5 bg-red-500/80 -rotate-45" />
                          </span>
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
                    aria-label={accessibleLabel}
                    aria-disabled={isUnavailable}
                    disabled={isUnavailable}
                    onClick={() => handleSelectOption(group.name, val.label)}
                    title={accessibleLabel}
                    className={cn(
                      "min-h-[44px] px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--kit-accent)] relative",
                      isSelected
                        ? "border-[var(--kit-accent)] bg-[var(--kit-accent)] text-[var(--kit-accent-fg)] shadow-xs"
                        : isAvailable
                        ? "border-[var(--kit-border)] bg-[var(--kit-card)] text-[var(--kit-text-primary)] hover:border-[var(--kit-accent)] hover:bg-[var(--kit-surface)]"
                        : isOutOfStock
                        ? "border-[var(--kit-border)] bg-[var(--kit-card)]/60 text-[var(--kit-muted-fg)] line-through hover:border-[var(--kit-muted-fg)]"
                        : "border-[var(--kit-border)]/50 bg-[var(--kit-muted)]/10 text-[var(--kit-muted-fg)]/40 cursor-not-allowed line-through"
                    )}
                  >
                    {val.label}
                    {isOutOfStock && !isSelected && (
                      <span className="sr-only"> (Out of stock)</span>
                    )}
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
