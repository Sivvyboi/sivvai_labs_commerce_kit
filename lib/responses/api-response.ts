import { NextResponse } from "next/server";
import { isAppError, ValidationError } from "../errors";

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    name: string;
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
}

/**
 * Formats a successful JSON response with uniform structure.
 */
export function jsonSuccess<T>(
  data: T,
  meta?: Record<string, unknown>,
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta ? { meta } : {}),
    },
    { status }
  );
}

/**
 * Formats an error JSON response, converting AppErrors safely.
 * Fields are read from ValidationError subclass, not the AppError base.
 */
export function jsonError(error: unknown): NextResponse<ApiErrorResponse> {
  if (isAppError(error)) {
    const fields = error instanceof ValidationError ? error.fields : undefined;
    return NextResponse.json(
      {
        success: false,
        error: {
          name: error.name,
          code: error.code,
          message: error.message,
          ...(fields ? { fields } : {}),
        },
      },
      { status: error.statusCode }
    );
  }

  // Fallback — never leak stack traces to the client
  const message = error instanceof Error ? error.message : "Internal Server Error";
  return NextResponse.json(
    {
      success: false,
      error: {
        name: "InternalServerError",
        code: "UNKNOWN",
        message,
      },
    },
    { status: 500 }
  );
}

/**
 * Higher-order wrapper for App Router API routes to ensure uniform error handling.
 */
export function withErrorHandler<T = unknown>(
  handler: (req: Request, context?: T) => Promise<Response>
) {
  return async (req: Request, context?: T): Promise<Response> => {
    try {
      return await handler(req, context);
    } catch (err) {
      return jsonError(err);
    }
  };
}
