import { z } from "zod";

export const AddToCartSchema = z.object({
  cartId: z.string().uuid().optional(),
  variantId: z.string().uuid("Invalid variant ID"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

export type AddToCartInput = z.infer<typeof AddToCartSchema>;

export const UpdateCartItemSchema = z.object({
  quantity: z.number().int().min(0, "Quantity cannot be negative"),
});

export type UpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>;
