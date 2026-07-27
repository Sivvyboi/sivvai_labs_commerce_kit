/**
 * app/api/shipping/methods/route.ts
 *
 * GET /api/shipping/methods
 * Returns active fulfilment methods for delivery estimation on the PDP.
 */

import { NextResponse } from "next/server";
import * as shippingRepo from "@/lib/db/shipping";

export async function GET() {
  try {
    const methods = await shippingRepo.findFulfilmentMethods();
    return NextResponse.json({ success: true, data: methods });
  } catch (error) {
    console.error("[GET /api/shipping/methods]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch fulfilment methods" },
      { status: 500 }
    );
  }
}
