import { AppError } from "./app-error";

export class InsufficientStockError extends AppError {
  constructor(variantId: string, requested: number, available: number) {
    super(
      `Insufficient stock for variant ${variantId}. Requested: ${requested}, Available: ${available}`,
      409,
      "CONFLICT"
    );
  }
}

export class ReservationExpiredError extends AppError {
  constructor(reservationId: string) {
    super(
      `Inventory reservation ${reservationId} has expired or is invalid`,
      410,
      "CONFLICT"
    );
  }
}
