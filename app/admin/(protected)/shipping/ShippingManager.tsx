"use client";

/**
 * app/admin/(protected)/shipping/ShippingManager.tsx
 *
 * Primary Client Component for Admin Shipping Management.
 * Manages Shipping Zones, Zone Rates, and Fulfilment Methods.
 */

import * as React from "react";
import {
  MapPin,
  Truck,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Tag,
  Clock,
  Globe2,
} from "lucide-react";
import { clsx } from "clsx";

import { useAdmin } from "@/features/admin/hooks/useAdmin";
import {
  createShippingZoneAction,
  updateShippingZoneAction,
  deleteShippingZoneAction,
  createFulfilmentMethodAction,
  updateFulfilmentMethodAction,
  toggleFulfilmentMethodStatusAction,
  deleteFulfilmentMethodAction,
  upsertShippingRateAction,
  deleteShippingRateAction,
} from "@/features/admin/actions/shipping.actions";

import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { Price } from "@/components/shared/Price";
import { ZoneModal } from "./ZoneModal";
import { MethodModal } from "./MethodModal";
import { RateModal } from "./RateModal";

import type {
  FulfilmentMethodRow,
  ShippingZoneRow,
  ShippingRateRow,
  ShippingZoneWithRatesAndMethods,
  ShippingRateWithMethod,
} from "@/lib/db/shipping";

interface ShippingManagerProps {
  initialZones: ShippingZoneWithRatesAndMethods[];
  initialMethods: FulfilmentMethodRow[];
}

export function ShippingManager({ initialZones, initialMethods }: ShippingManagerProps) {
  const { execute, loading, error, clearError } = useAdmin();

  const [activeTab, setActiveTab] = React.useState<"zones" | "methods">("zones");
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  // Modals state
  const [zoneModalOpen, setZoneModalOpen] = React.useState(false);
  const [editingZone, setEditingZone] = React.useState<ShippingZoneRow | null>(null);

  const [methodModalOpen, setMethodModalOpen] = React.useState(false);
  const [editingMethod, setEditingMethod] = React.useState<FulfilmentMethodRow | null>(null);

  const [rateModalOpen, setRateModalOpen] = React.useState(false);
  const [rateZone, setRateZone] = React.useState<ShippingZoneRow | null>(null);
  const [editingRate, setEditingRate] = React.useState<ShippingRateWithMethod | null>(null);

  // Deletion confirm state
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => Promise<void>;
  }>({
    open: false,
    title: "",
    description: "",
    onConfirm: async () => {},
  });

  function showSuccess(msg: string) {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  }

  // ---------------------------------------------------------------------------
  // Zone Handlers
  // ---------------------------------------------------------------------------

  function handleOpenCreateZone() {
    setEditingZone(null);
    setZoneModalOpen(true);
  }

  function handleOpenEditZone(zone: ShippingZoneRow) {
    setEditingZone(zone);
    setZoneModalOpen(true);
  }

  async function handleSaveZone(data: { id?: string; name: string; regions: string[] }) {
    if (data.id) {
      const res = await execute(() =>
        updateShippingZoneAction({
          id: data.id!,
          name: data.name,
          regions: data.regions,
        }),
        { refresh: true }
      );
      if (res?.success) {
        setZoneModalOpen(false);
        showSuccess(`Shipping zone "${data.name}" updated successfully.`);
      }
    } else {
      const res = await execute(() =>
        createShippingZoneAction({
          name: data.name,
          regions: data.regions,
        }),
        { refresh: true }
      );
      if (res?.success) {
        setZoneModalOpen(false);
        showSuccess(`Shipping zone "${data.name}" created successfully.`);
      }
    }
  }

  function handleDeleteZonePrompt(zone: ShippingZoneRow) {
    setConfirmDialog({
      open: true,
      title: `Delete Zone "${zone.name}"?`,
      description: `This will remove the shipping zone and all its associated rates. Historical orders will remain unaffected.`,
      onConfirm: async () => {
        const res = await execute(() => deleteShippingZoneAction(zone.id), { refresh: true });
        if (res?.success) {
          showSuccess(`Shipping zone "${zone.name}" deleted.`);
        }
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Rate Handlers
  // ---------------------------------------------------------------------------

  function handleOpenAddRate(zone: ShippingZoneRow) {
    setRateZone(zone);
    setEditingRate(null);
    setRateModalOpen(true);
  }

  function handleOpenEditRate(zone: ShippingZoneRow, rate: ShippingRateWithMethod) {
    setRateZone(zone);
    setEditingRate(rate);
    setRateModalOpen(true);
  }

  async function handleSaveRate(data: {
    id?: string;
    zone_id: string;
    fulfilment_method_id: string;
    rate_type: "flat" | "weight_based" | "free_above";
    flat_amount: number;
    per_kg_amount: number;
    free_above_order_total?: number | null;
  }) {
    const res = await execute(() => upsertShippingRateAction(data), { refresh: true });
    if (res?.success) {
      setRateModalOpen(false);
      showSuccess("Shipping rate saved successfully.");
    }
  }

  function handleDeleteRatePrompt(rate: ShippingRateRow, methodName?: string) {
    setConfirmDialog({
      open: true,
      title: "Remove Shipping Rate?",
      description: `Remove rate for "${methodName || "this method"}" from this zone?`,
      onConfirm: async () => {
        const res = await execute(() => deleteShippingRateAction(rate.id), { refresh: true });
        if (res?.success) {
          showSuccess("Shipping rate removed.");
        }
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Method Handlers
  // ---------------------------------------------------------------------------

  function handleOpenCreateMethod() {
    setEditingMethod(null);
    setMethodModalOpen(true);
  }

  function handleOpenEditMethod(method: FulfilmentMethodRow) {
    setEditingMethod(method);
    setMethodModalOpen(true);
  }

  async function handleSaveMethod(data: {
    id?: string;
    type: "pickup" | "local_delivery" | "courier";
    name: string;
    description?: string | null;
    is_enabled: boolean;
    estimated_days_min: number;
    estimated_days_max: number;
  }) {
    if (data.id) {
      const res = await execute(() =>
        updateFulfilmentMethodAction({
          id: data.id!,
          type: data.type,
          name: data.name,
          description: data.description,
          is_enabled: data.is_enabled,
          estimated_days_min: data.estimated_days_min,
          estimated_days_max: data.estimated_days_max,
        }),
        { refresh: true }
      );
      if (res?.success) {
        setMethodModalOpen(false);
        showSuccess(`Fulfilment method "${data.name}" updated.`);
      }
    } else {
      const res = await execute(() =>
        createFulfilmentMethodAction({
          type: data.type,
          name: data.name,
          description: data.description,
          is_enabled: data.is_enabled,
          estimated_days_min: data.estimated_days_min,
          estimated_days_max: data.estimated_days_max,
        }),
        { refresh: true }
      );
      if (res?.success) {
        setMethodModalOpen(false);
        showSuccess(`Fulfilment method "${data.name}" created.`);
      }
    }
  }

  async function handleToggleMethodStatus(method: FulfilmentMethodRow) {
    const nextState = !method.is_enabled;
    const res = await execute(
      () => toggleFulfilmentMethodStatusAction(method.id, nextState),
      { refresh: true }
    );
    if (res?.success) {
      showSuccess(`Method "${method.name}" ${nextState ? "enabled" : "disabled"}.`);
    }
  }

  function handleDeleteMethodPrompt(method: FulfilmentMethodRow) {
    setConfirmDialog({
      open: true,
      title: `Delete Method "${method.name}"?`,
      description: `This will remove this fulfilment method and its rates across all zones. Ensure no active checkout sessions are depending on it.`,
      onConfirm: async () => {
        const res = await execute(() => deleteFulfilmentMethodAction(method.id), { refresh: true });
        if (res?.success) {
          showSuccess(`Fulfilment method "${method.name}" deleted.`);
        }
      },
    });
  }

  return (
    <div className="space-y-6">
      {/* Alert Notifications */}
      {error && (
        <div className="flex items-center justify-between rounded-[var(--kit-radius-md)] border border-[var(--kit-danger)]/20 bg-[var(--kit-danger)]/10 p-4 text-xs font-medium text-[var(--kit-danger)]">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="hover:underline text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-[var(--kit-radius-md)] border border-[var(--kit-accent)]/20 bg-[var(--kit-accent)]/10 p-4 text-xs font-medium text-[var(--kit-accent)] animate-in fade-in">
          <CheckCircle2 size={16} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tabs Header & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--kit-border)] pb-4">
        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("zones")}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-[var(--kit-radius-md)] text-xs font-semibold transition-colors",
              activeTab === "zones"
                ? "bg-[var(--kit-accent)] text-white shadow-xs"
                : "text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)]"
            )}
          >
            <MapPin size={15} />
            <span>Zones & Rates</span>
            <span
              className={clsx(
                "ml-1 rounded-full px-2 py-0.5 text-[10px]",
                activeTab === "zones"
                  ? "bg-white/20 text-white"
                  : "bg-[var(--kit-muted)] text-[var(--kit-text-muted)]"
              )}
            >
              {initialZones.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("methods")}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-[var(--kit-radius-md)] text-xs font-semibold transition-colors",
              activeTab === "methods"
                ? "bg-[var(--kit-accent)] text-white shadow-xs"
                : "text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)]"
            )}
          >
            <Truck size={15} />
            <span>Fulfilment Methods</span>
            <span
              className={clsx(
                "ml-1 rounded-full px-2 py-0.5 text-[10px]",
                activeTab === "methods"
                  ? "bg-white/20 text-white"
                  : "bg-[var(--kit-muted)] text-[var(--kit-text-muted)]"
              )}
            >
              {initialMethods.length}
            </span>
          </button>
        </div>

        {/* Top Action Button */}
        <div>
          {activeTab === "zones" ? (
            <button
              type="button"
              onClick={handleOpenCreateZone}
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-4 text-xs font-medium text-white hover:opacity-90 transition-opacity"
            >
              <Plus size={16} /> Add Shipping Zone
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenCreateMethod}
              className="inline-flex h-9 items-center gap-1.5 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-4 text-xs font-medium text-white hover:opacity-90 transition-opacity"
            >
              <Plus size={16} /> Add Fulfilment Method
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: ZONES & RATES */}
      {activeTab === "zones" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {initialZones.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--kit-radius-lg)] border border-dashed border-[var(--kit-border)] bg-[var(--kit-surface)] px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--kit-muted)] text-[var(--kit-text-muted)]">
                <Globe2 size={26} aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--kit-text-primary)]">No shipping zones yet</p>
                <p className="mt-1 text-sm text-[var(--kit-text-secondary)]">Create your first shipping zone to define deliverable regions and customer delivery rates.</p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateZone}
                className="inline-flex h-9 items-center gap-2 rounded-[var(--kit-radius-md)] px-4 text-sm font-medium bg-[var(--kit-accent)] text-white hover:opacity-90 transition-opacity"
              >
                Add Shipping Zone
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {initialZones.map((zone) => {
                const isNationwide = zone.regions.some(
                  (r) => r.toLowerCase() === "nationwide" || r === "*"
                );

                return (
                  <div
                    key={zone.id}
                    className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] shadow-[var(--kit-shadow-sm)] overflow-hidden"
                  >
                    {/* Zone Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[var(--kit-surface)] border-b border-[var(--kit-border)]">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <h2 className="text-base font-bold text-[var(--kit-text-primary)]">
                            {zone.name}
                          </h2>
                          <StatusBadge status="active" />
                        </div>

                        {/* Coverage Regions */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--kit-text-secondary)]">
                          <span className="font-semibold text-[var(--kit-text-muted)]">Coverage:</span>
                          {isNationwide ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--kit-accent)]/10 text-[var(--kit-accent)] font-medium text-[11px]">
                              <Globe2 size={12} /> All States (Nationwide)
                            </span>
                          ) : (
                            zone.regions.slice(0, 10).map((r) => (
                              <span
                                key={r}
                                className="px-2 py-0.5 rounded-md bg-[var(--kit-muted)] text-[var(--kit-text-primary)] font-medium text-[11px]"
                              >
                                {r}
                              </span>
                            ))
                          )}
                          {!isNationwide && zone.regions.length > 10 && (
                            <span className="text-[11px] text-[var(--kit-text-muted)] font-medium">
                              +{zone.regions.length - 10} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Zone Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAddRate(zone)}
                          className="inline-flex h-8 items-center gap-1 rounded-[var(--kit-radius-md)] bg-[var(--kit-accent)] px-3 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                        >
                          <Plus size={14} /> Add Rate
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditZone(zone)}
                          aria-label="Edit Zone"
                          className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-card)] text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)] transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteZonePrompt(zone)}
                          aria-label="Delete Zone"
                          className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-card)] text-[var(--kit-text-muted)] hover:bg-[var(--kit-danger)]/10 hover:text-[var(--kit-danger)] transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Zone Rates List */}
                    <div className="p-5">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--kit-text-muted)]">
                          Shipping Rates ({zone.rates?.length || 0})
                        </h3>
                      </div>

                      {!zone.rates || zone.rates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center rounded-[var(--kit-radius-md)] border border-dashed border-[var(--kit-border)] bg-[var(--kit-surface)]/40 p-4">
                          <Tag size={20} className="text-[var(--kit-text-muted)] mb-1" />
                          <p className="text-xs font-medium text-[var(--kit-text-secondary)]">
                            No shipping rates configured for this zone yet.
                          </p>
                          <p className="text-[11px] text-[var(--kit-text-muted)] mt-0.5">
                            Add a method rate so customers in {zone.name} can select it at checkout.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleOpenAddRate(zone)}
                            className="mt-3 text-xs font-semibold text-[var(--kit-accent)] hover:underline"
                          >
                            + Add Shipping Rate
                          </button>
                        </div>
                      ) : (
                        <div className="divide-y divide-[var(--kit-border)] border border-[var(--kit-border)] rounded-[var(--kit-radius-md)] overflow-hidden">
                          {zone.rates.map((rate) => {
                            const method = rate.fulfilment_methods;
                            const isMethodActive = method?.is_enabled ?? true;

                            return (
                              <div
                                key={rate.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-[var(--kit-card)] hover:bg-[var(--kit-surface)] transition-colors gap-3"
                              >
                                <div className="flex items-start sm:items-center gap-3">
                                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[var(--kit-radius-md)] bg-[var(--kit-muted)] text-[var(--kit-text-primary)] mt-0.5 sm:mt-0">
                                    <Truck size={15} />
                                  </span>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs sm:text-sm font-bold text-[var(--kit-text-primary)]">
                                        {method?.name ?? "Custom Fulfilment Method"}
                                      </p>
                                      <span
                                        className={clsx(
                                          "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                                          isMethodActive
                                            ? "bg-[var(--kit-accent)]/10 text-[var(--kit-accent)]"
                                            : "bg-[var(--kit-muted)] text-[var(--kit-text-muted)]"
                                        )}
                                      >
                                        {isMethodActive ? "Active" : "Disabled Method"}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-[var(--kit-text-muted)]">
                                      {method?.estimated_days_min && method?.estimated_days_max ? (
                                        <span className="flex items-center gap-1">
                                          <Clock size={12} />
                                          {method.estimated_days_min}–{method.estimated_days_max} business days
                                        </span>
                                      ) : null}
                                      {rate.free_above_order_total ? (
                                        <span className="text-[var(--kit-accent)] font-medium">
                                          Free on orders over{" "}
                                          <Price amount={rate.free_above_order_total} size="sm" />
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-4">
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-[var(--kit-text-primary)]">
                                      {rate.flat_amount === 0 ? (
                                        <span className="text-emerald-500 font-bold uppercase text-xs">
                                          Free Delivery
                                        </span>
                                      ) : (
                                        <Price amount={rate.flat_amount} size="md" />
                                      )}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditRate(zone, rate)}
                                      aria-label="Edit Rate"
                                      className="flex h-7 w-7 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)] transition-colors"
                                    >
                                      <Edit2 size={13} />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRatePrompt(rate, method?.name)}
                                      aria-label="Delete Rate"
                                      className="flex h-7 w-7 items-center justify-center rounded-[var(--kit-radius-md)] text-[var(--kit-text-muted)] hover:bg-[var(--kit-danger)]/10 hover:text-[var(--kit-danger)] transition-colors"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: FULFILMENT METHODS */}
      {activeTab === "methods" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {initialMethods.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-[var(--kit-radius-lg)] border border-dashed border-[var(--kit-border)] bg-[var(--kit-surface)] px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--kit-muted)] text-[var(--kit-text-muted)]">
                <Truck size={26} aria-hidden />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--kit-text-primary)]">No fulfilment methods yet</p>
                <p className="mt-1 text-sm text-[var(--kit-text-secondary)]">Define shipping and pickup options (Standard Courier, Express Delivery, Store Pickup).</p>
              </div>
              <button
                type="button"
                onClick={handleOpenCreateMethod}
                className="inline-flex h-9 items-center gap-2 rounded-[var(--kit-radius-md)] px-4 text-sm font-medium bg-[var(--kit-accent)] text-white hover:opacity-90 transition-opacity"
              >
                Add Fulfilment Method
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[var(--kit-border)] border border-[var(--kit-border)] rounded-[var(--kit-radius-lg)] bg-[var(--kit-card)] overflow-hidden shadow-[var(--kit-shadow-sm)]">
              {initialMethods.map((method) => {
                return (
                  <div
                    key={method.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-[var(--kit-surface)]/50 transition-colors gap-4"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <span
                        className={clsx(
                          "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[var(--kit-radius-md)]",
                          method.is_enabled
                            ? "bg-[var(--kit-accent)]/10 text-[var(--kit-accent)]"
                            : "bg-[var(--kit-muted)] text-[var(--kit-text-muted)]"
                        )}
                      >
                        <Truck size={20} />
                      </span>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[var(--kit-text-primary)]">
                            {method.name}
                          </h3>
                          <span className="px-2 py-0.5 rounded-md bg-[var(--kit-muted)] text-[var(--kit-text-secondary)] text-[10px] font-semibold uppercase tracking-wider">
                            {method.type.replace("_", " ")}
                          </span>
                          <StatusBadge status={method.is_enabled ? "active" : "disabled"} />
                        </div>

                        {method.description && (
                          <p className="text-xs text-[var(--kit-text-secondary)]">
                            {method.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-[var(--kit-text-muted)]">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            Estimated: {method.estimated_days_min}–{method.estimated_days_max} business days
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--kit-border)]">
                      {/* Enable/Disable Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleMethodStatus(method)}
                        className={clsx(
                          "h-8 px-3 rounded-[var(--kit-radius-md)] text-xs font-medium border transition-colors flex items-center gap-1.5",
                          method.is_enabled
                            ? "border-[var(--kit-border)] text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)]"
                            : "border-[var(--kit-accent)] bg-[var(--kit-accent)]/10 text-[var(--kit-accent)] hover:bg-[var(--kit-accent)]/20"
                        )}
                      >
                        {method.is_enabled ? (
                          <>
                            <XCircle size={13} /> Disable
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={13} /> Enable
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditMethod(method)}
                        aria-label="Edit Method"
                        className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] text-[var(--kit-text-secondary)] hover:bg-[var(--kit-muted)] hover:text-[var(--kit-text-primary)] transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteMethodPrompt(method)}
                        aria-label="Delete Method"
                        className="flex h-8 w-8 items-center justify-center rounded-[var(--kit-radius-md)] border border-[var(--kit-border)] bg-[var(--kit-surface)] text-[var(--kit-text-muted)] hover:bg-[var(--kit-danger)]/10 hover:text-[var(--kit-danger)] transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODALS — keyed so React remounts them when the editing target changes,
           avoiding the need for setState-in-effect resets. */}
      <ZoneModal
        key={editingZone?.id ?? "new-zone"}
        open={zoneModalOpen}
        onClose={() => setZoneModalOpen(false)}
        onSubmit={handleSaveZone}
        initialZone={editingZone}
        loading={loading}
      />

      <MethodModal
        key={editingMethod?.id ?? "new-method"}
        open={methodModalOpen}
        onClose={() => setMethodModalOpen(false)}
        onSubmit={handleSaveMethod}
        initialMethod={editingMethod}
        loading={loading}
      />

      <RateModal
        key={editingRate?.id ?? "new-rate"}
        open={rateModalOpen}
        onClose={() => setRateModalOpen(false)}
        onSubmit={handleSaveRate}
        zone={rateZone}
        methods={initialMethods}
        initialRate={editingRate}
        loading={loading}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant="danger"
        loading={loading}
      />
    </div>
  );
}
