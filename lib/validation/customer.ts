import { z } from "zod";

export const GuestOrderLookupSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
  email: z.string().email("Valid email address is required"),
});

export type GuestOrderLookupInput = z.infer<typeof GuestOrderLookupSchema>;

export const UpdateCustomerProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional().nullable(),
});

export type UpdateCustomerProfileInput = z.infer<typeof UpdateCustomerProfileSchema>;

export const CustomerAddressSchema = z.object({
  label: z.string().min(1, "Label is required (e.g. Home, Work)"),
  streetLine1: z.string().min(1, "Street address is required"),
  streetLine2: z.string().optional().nullable(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required").default("NG"),
  isDefault: z.boolean().default(false),
});

export type CustomerAddressInput = z.infer<typeof CustomerAddressSchema>;

// ---------------------------------------------------------------------------
// Customer Authentication Schemas
// ---------------------------------------------------------------------------

export const CustomerSignInSchema = z.object({
  email: z.string().email("Valid email address is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type CustomerSignInInput = z.infer<typeof CustomerSignInSchema>;

export const CustomerSignUpSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email address is required"),
  phone: z.string().optional().nullable(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type CustomerSignUpInput = z.infer<typeof CustomerSignUpSchema>;

export const CustomerForgotPasswordSchema = z.object({
  email: z.string().email("Valid email address is required"),
});

export type CustomerForgotPasswordInput = z.infer<typeof CustomerForgotPasswordSchema>;

export const CustomerResetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Password confirmation is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type CustomerResetPasswordInput = z.infer<typeof CustomerResetPasswordSchema>;


