import * as productRepo from "@/lib/db/products";
import { NotFoundError } from "@/lib/errors";

export async function getProducts(params?: productRepo.FindProductsParams) {
  return productRepo.findProducts(params);
}

export async function getProductBySlug(slug: string) {
  const product = await productRepo.findProductBySlug(slug);
  if (!product) {
    throw new NotFoundError("Product", slug);
  }
  return product;
}

export async function getProductById(id: string) {
  const product = await productRepo.findProductById(id);
  if (!product) {
    throw new NotFoundError("Product", id);
  }
  return product;
}
