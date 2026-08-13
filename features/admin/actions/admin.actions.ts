"use server";

/**
 * features/admin/actions/admin.actions.ts
 *
 * Backward-compatibility re-export barrel for modularized admin actions.
 * Actions have been split into domain-specific modules:
 *  - product.actions.ts
 *  - category.actions.ts
 *  - inventory.actions.ts
 *  - order.actions.ts
 *  - customer.actions.ts
 *  - promotion.actions.ts
 *  - store.actions.ts
 */

export * from "./product.actions";
export * from "./category.actions";
export * from "./inventory.actions";
export * from "./order.actions";
export * from "./customer.actions";
export * from "./promotion.actions";
export * from "./store.actions";
