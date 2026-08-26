/**
 * types/paystack.d.ts
 *
 * TypeScript declarations for @paystack/inline-js library.
 */

declare module "@paystack/inline-js" {
  export interface PaystackTransaction {
    id?: number;
    reference?: string;
    message?: string;
    status?: string;
    trans?: string;
    transaction?: string;
    trxref?: string;
    [key: string]: unknown;
  }

  export interface PaystackResumeCallbacks {
    onLoad?: (response: { id: number; customer: Record<string, unknown>; accessCode: string }) => void;
    onSuccess?: (transaction: PaystackTransaction) => void;
    onCancel?: () => void;
    onError?: (error: { message?: string }) => void;
  }

  export interface PaystackNewTransactionOptions {
    key: string;
    email: string;
    amount: number;
    currency?: string;
    reference?: string;
    onSuccess?: (transaction: PaystackTransaction) => void;
    onCancel?: () => void;
    onError?: (error: { message?: string }) => void;
    onLoad?: (response: unknown) => void;
    metadata?: Record<string, unknown>;
  }

  export default class PaystackPop {
    constructor();
    newTransaction(options: PaystackNewTransactionOptions): unknown;
    resumeTransaction(accessCode: string, callbacks?: PaystackResumeCallbacks): unknown;
    cancelTransaction(idOrTransactionObject?: unknown): void;
    isLoaded(): boolean;
  }
}
