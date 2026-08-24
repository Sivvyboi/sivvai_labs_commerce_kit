import { z } from "zod";

export const InitiateCheckoutSchema = z.object({
  cartId: z.string().uuid("Invalid cart ID"),
  email: z.string().email("Valid email required"),
  fullName: z.string().min(1, "Full name required"),
  phone: z.string().optional(),
  savedAddressId: z.string().uuid().optional(),
  saveAddressToAccount: z.boolean().optional(),
  shippingAddress: z.object({
    addressLine1: z.string().min(1, "Street address required"),
    addressLine2: z.string().optional(),
    city: z.string().min(1, "City required"),
    state: z.string().min(1, "State required"),
    country: z.string().default("NG"),
  }),
  shippingMethodId: z.string().uuid().optional(),
  promoCode: z.string().optional(),
});

export type InitiateCheckoutInput = z.infer<typeof InitiateCheckoutSchema>;
