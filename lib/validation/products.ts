import { z } from "zod";

export const ProductQuerySchema = z.object({
  categorySlug: z.string().optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

export type ProductQueryInput = z.infer<typeof ProductQuerySchema>;

export const CreateProductSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  category_id: z.string().uuid().optional(),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
