/**
 * lib/errors/app-error.ts
 *
 * Typed error class hierarchy for the application.
 *
 * Why not just `throw new Error("Something went wrong")`?
 * - Typed errors enable structured error handling (`instanceof` checks).
 * - `code` fields let API routes return consistent JSON error shapes.
 * - Error subclasses document the failure modes of each layer.
 *
 * Usage:
 *   import { AppError, NotFoundError, ValidationError } from "@/lib/errors/app-error";
 *
 *   // In a Server Action or Route Handler:
 *   if (!product) throw new NotFoundError("Product", id);
 *
 *   // In an API route catch block:
 *   catch (error) {
 *     if (error instanceof AppError) {
 *       return Response.json({ error: error.message, code: error.code }, { status: error.statusCode });
 *     }
 *     throw error; // Re-throw unknown errors to the global error boundary
 *   }
 */

// ---------------------------------------------------------------------------
// Error codes — string literals for type-safety in API responses
// ---------------------------------------------------------------------------

export const ERROR_CODES = {
  UNKNOWN: "UNKNOWN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION: "VALIDATION",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ---------------------------------------------------------------------------
// Base error class
// ---------------------------------------------------------------------------

/**
 * Base error class. All application errors extend this.
 * Never throw raw `Error` in application code — always use a typed subclass.
 */
export class AppError extends Error {
  /** HTTP status code to send in API responses */
  readonly statusCode: number;
  /** Machine-readable error code for client handling */
  readonly code: ErrorCode;
  /** Whether this error should be reported to an error monitoring service */
  readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    code: ErrorCode = ERROR_CODES.UNKNOWN,
    isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Maintains proper prototype chain in ES5 transpile environments
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }

  /** Serializes the error to a plain JSON-safe object for API responses */
  toJSON(): Record<string, unknown> {
    return {
      error: this.name,
      code: this.code,
      message: this.message,
    };
  }
}

// ---------------------------------------------------------------------------
// Domain error subclasses
// ---------------------------------------------------------------------------

/**
 * 404 Not Found — a requested resource does not exist.
 *
 * @example throw new NotFoundError("Product", "running-shoes-v2")
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const msg = identifier
      ? `${resource} not found: "${identifier}"`
      : `${resource} not found`;
    super(msg, 404, ERROR_CODES.NOT_FOUND);
  }
}

/**
 * 422 Validation Error — input data failed validation.
 *
 * @example throw new ValidationError("Email address is invalid")
 */
export class ValidationError extends AppError {
  readonly fields?: Record<string, string[]>;

  constructor(message: string, fields?: Record<string, string[]>) {
    super(message, 422, ERROR_CODES.VALIDATION);
    this.fields = fields;
  }

  override toJSON() {
    return { ...super.toJSON(), fields: this.fields };
  }
}

/**
 * 401 Unauthorized — the request requires authentication.
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401, ERROR_CODES.UNAUTHORIZED);
  }
}

/**
 * 403 Forbidden — the authenticated user lacks permission.
 */
export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, 403, ERROR_CODES.FORBIDDEN);
  }
}

/**
 * 409 Conflict — the request conflicts with existing state.
 * e.g. duplicate email on sign-up.
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, ERROR_CODES.CONFLICT);
  }
}

/**
 * 429 Rate Limited — the client has sent too many requests.
 */
export class RateLimitedError extends AppError {
  constructor(message = "Too many requests. Please try again later.") {
    super(message, 429, ERROR_CODES.RATE_LIMITED);
  }
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

/** Returns true if an unknown caught value is an AppError */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
