/**
 * app/(storefront)/products/[slug]/page.tsx
 *
 * Product Detail Page (PDP) — Server Component with ISR.
 *
 * Features:
 *  - ISR Revalidation: 3600 seconds
 *  - generateMetadata() for dynamic SEO & OpenGraph tags
 *  - generateStaticParams() pre-rendering top products
 *  - notFound() handling when product slug is invalid or unpublished
 *  - JSON-LD Product schema injection
 *  - Breadcrumb navigation
 *  - Interactive ProductDetailClient
 *  - RecentlyViewed & Suspense-wrapped RelatedProducts
 */

import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import * as productService from "@/services/product-service";
import { siteConfig } from "@/config/site";
import { Breadcrumb, type BreadcrumbItem } from "@/components/shared/Breadcrumb";
import { ProductDetailClient } from "./ProductDetailClient";
import { RelatedProducts } from "./RelatedProducts";
import { RecentlyViewed } from "./RecentlyViewed";
import { buildProductSchema } from "@/features/storefront/utils/buildProductSchema";
import { ProductGrid } from "@/components/storefront/product/ProductGrid";
import { ROUTES } from "@/constants/routes";
import { NotFoundError } from "@/lib/errors";

export const revalidate = 3600;

export interface ProductPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variant?: string }>;
}

export async function generateStaticParams() {
  try {
    const { data: products } = await productService.getProducts({ limit: 20 });
    return products.map((p) => ({ slug: p.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: ProductPageProps): Promise<Metadata> {
  try {
    const { slug } = await params;
    const { variant: variantId } = (await searchParams) ?? {};
    const product = await productService.getProductBySlug(slug);

    const title = product.seo_title || product.name;
    const description =
      product.seo_description ||
      product.description ||
      `Buy ${product.name} online at ${siteConfig.name}. Quality guaranteed.`;

    const selectedVariant = variantId
      ? product.variants?.find((v) => v.id === variantId && v.status === "active" && !v.archived_at)
      : undefined;

    let ogImage: string | undefined;
    if (selectedVariant?.image_id && product.images) {
      ogImage = product.images.find((img) => img.id === selectedVariant.image_id)?.url;
    }
    if (!ogImage) {
      ogImage =
        product.images?.find((img) => img.is_primary)?.url ??
        product.images?.[0]?.url;
    }

    const canonicalUrl = `${siteConfig.url}/products/${slug}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        siteName: siteConfig.name,
        images: ogImage
          ? [{ url: ogImage, alt: product.name }]
          : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ogImage ? [ogImage] : undefined,
      },
      alternates: {
        canonical: canonicalUrl,
      },
    };
  } catch {
    return {
      title: "Product",
    };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  let product;
  try {
    product = await productService.getProductBySlug(slug);
  } catch (err) {
    if (err instanceof NotFoundError) {
      notFound();
    }
    throw err;
  }

  // Double-check product status is published
  if (product.status !== "published" || product.archived_at !== null) {
    notFound();
  }

  const canonicalUrl = `${siteConfig.url}/products/${slug}`;
  const schema = buildProductSchema(product, canonicalUrl);

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Home", href: ROUTES.home },
    { label: "Catalog", href: ROUTES.catalog },
  ];

  if (product.category) {
    breadcrumbItems.push({
      label: product.category.name,
      href: ROUTES.category(product.category.slug),
    });
  }

  breadcrumbItems.push({ label: product.name });

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumb Navigation */}
      <Breadcrumb items={breadcrumbItems} />

      {/* Main Interactive Product Detail Area */}
      <ProductDetailClient product={product} />

      {/* Recently Viewed Products (Client Component) */}
      <RecentlyViewed currentProduct={product} />

      {/* Related Products (Async Server Component wrapped in Suspense) */}
      <Suspense
        fallback={
          <section className="space-y-6 pt-12 border-t border-[var(--kit-border)]">
            <div className="h-7 w-48 rounded-lg bg-[var(--kit-surface)] animate-pulse" />
            <ProductGrid loading skeletonCount={4} />
          </section>
        }
      >
        <RelatedProducts
          categorySlug={product.category?.slug}
          currentProductId={product.id}
        />
      </Suspense>

      {/* Schema.org Product JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </div>
  );
}
