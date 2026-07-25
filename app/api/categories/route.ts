import { categoryService } from "@/services";
import { jsonSuccess, withErrorHandler } from "@/lib/responses";

export const GET = withErrorHandler(async () => {
  const tree = await categoryService.getCategoryTree();
  return jsonSuccess(tree);
});
