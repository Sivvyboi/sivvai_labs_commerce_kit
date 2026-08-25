/**
 * app/api/shipping/methods/route.ts
 *
 * GET /api/shipping/methods
 * Returns active fulfilment methods for delivery estimation on the PDP.
 */

import { NextRequest, NextResponse } from "next/server";
import * as shippingRepo from "@/lib/db/shipping";
import * as shippingService from "@/services/shipping-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state");
    const city = searchParams.get("city");
    const country = searchParams.get("country") ?? "NG";
    const subtotalStr = searchParams.get("subtotal");
    const subtotal = subtotalStr ? parseFloat(subtotalStr) || 0 : 0;

    if (state || city) {
      const result = await shippingService.resolveShippingOptionsForAddress(
        { state: state ?? undefined, city: city ?? undefined, country: country ?? undefined },
        subtotal
      );
      return NextResponse.json({ success: true, ...result });
    }

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
