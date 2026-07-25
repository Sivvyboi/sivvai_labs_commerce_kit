import { productService } from "@/services";
import { jsonSuccess, withErrorHandler } from "@/lib/responses";

export const GET = withErrorHandler(async (_req: Request, context?: { params: Promise<{ id: string }> }) => {
  const params = await context?.params;
  const id = params?.id || "";
  
  // Try fetching by ID first, then by slug
  let product = await productService.getProductById(id).catch(() => null);
  if (!product) {
    product = await productService.getProductBySlug(id);
  }
  return jsonSuccess(product);
});
