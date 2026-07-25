import { productService } from "@/services";
import { ProductQuerySchema } from "@/lib/validation";
import { jsonSuccess, withErrorHandler } from "@/lib/responses";

export const GET = withErrorHandler(async (req: Request) => {
  const url = new URL(req.url);
  const queryParams = Object.fromEntries(url.searchParams.entries());
  const parsed = ProductQuerySchema.parse(queryParams);

  const result = await productService.getProducts(parsed);
  return jsonSuccess(result.data, { count: result.count });
});
