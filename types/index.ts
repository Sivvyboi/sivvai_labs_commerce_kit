/**
 * types/index.ts
 *
 * Barrel export for project-wide types.
 *
 * Commerce domain types (Product, Cart, Order, etc.) are NOT exported here.
 * They will be added once the Supabase schema migrations are designed.
 *
 * Usage:
 *   import type { Database, Tables } from "@/types";
 */

export type {
  Json,
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "./database.types";

// Re-export the environment.d.ts augmentation.
// The file has no named exports — the `declare namespace NodeJS` block
// is applied globally when imported. This import ensures the declaration
// is included in the compilation even if no other file references it.
import "./environment.d";
