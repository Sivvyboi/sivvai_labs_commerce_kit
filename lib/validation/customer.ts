import { z } from "zod";

export const CustomerProfileSchema = z.object({
  fullName: z.string().min(1, "Full name required"),
  phone: z.string().optional(),
});

export type CustomerProfileInput = z.infer<typeof CustomerProfileSchema>;

export const CustomerAddressSchema = z.object({
  addressLine1: z.string().min(1, "Address line 1 required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City required"),
  state: z.string().min(1, "State required"),
  postalCode: z.string().optional(),
  country: z.string().default("NG"),
  isDefault: z.boolean().default(false),
});

export type CustomerAddressInput = z.infer<typeof CustomerAddressSchema>;
