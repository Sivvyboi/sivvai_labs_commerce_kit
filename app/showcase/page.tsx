"use client";

import * as React from "react";
import { 
  Sparkles, 
  ChevronLeft, 
  Settings,
  ShoppingBag,
  Grid as GridIcon,
  User,
  Heart,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

import { Shell } from "@/components/layout/shell";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Stack } from "@/components/layout/stack";
import { Grid } from "@/components/layout/grid";
import { Spacer } from "@/components/layout/spacer";

import { LoadingView } from "@/components/shared/loading-view";
import { ErrorView } from "@/components/shared/error-view";
import { NotFoundView } from "@/components/shared/not-found-view";
import { ComingSoonView } from "@/components/shared/coming-soon-view";

// Batch 3 Storefront Components
import { Price } from "@/components/shared/Price";
import { StockBadge } from "@/components/shared/StockBadge";
import { Rating } from "@/components/shared/Rating";
import { Breadcrumb } from "@/components/shared/Breadcrumb";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState } from "@/components/shared/EmptyState";
import { QuantitySelector } from "@/components/storefront/product/QuantitySelector";
import { ProductCardSkeleton } from "@/components/storefront/product/ProductCardSkeleton";
import { ProductCard } from "@/components/storefront/product/ProductCard";
import { ProductGrid } from "@/components/storefront/product/ProductGrid";
import type { ProductWithDetails } from "@/lib/db/products";

// Mock Product for Showcase Visual Regression
const mockProduct: ProductWithDetails = {
  id: "prod-1",
  name: "Classic Silk Ankara Dress",
  slug: "classic-silk-ankara-dress",
  description: "Handcrafted African Ankara print dress with silk lining.",
  base_price: 25000,
  compare_at_price: 32000,
  sale_price: null,
  cost_price: null,
  is_featured: true,
  seo_title: null,
  seo_description: null,
  visibility: "visible",
  published_at: new Date().toISOString(),
  status: "published",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  archived_at: null,
  deleted_at: null,
  category_id: "cat-1",
  category: {
    id: "cat-1",
    name: "Womenswear",
    slug: "womenswear",
    description: "Women fashion",
    seo_title: null,
    seo_description: null,
    og_image: null,
    parent_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    archived_at: null,
  },
  variants: [
    {
      id: "var-1",
      product_id: "prod-1",
      image_id: null,
      sku: "ANK-DRS-RED-M",
      option_combination: { Color: "Red", Size: "M" },
      price_override: null,
      is_default: true,
      status: "active",
      archived_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  images: [
    {
      id: "img-1",
      product_id: "prod-1",
      url: "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&auto=format&fit=crop&q=80",
      alt_text: "Classic Silk Ankara Dress",
      display_order: 0,
      is_primary: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
};

const mockProduct2: ProductWithDetails = {
  ...mockProduct,
  id: "prod-2",
  name: "Handmade Leather Sandals",
  slug: "handmade-leather-sandals",
  base_price: 18000,
  compare_at_price: null,
  status: "archived",
  category: {
    ...mockProduct.category!,
    name: "Footwear",
    slug: "footwear",
  },
  variants: [
    {
      ...mockProduct.variants[0],
      status: "draft",
    },
  ],
};

export default function ShowcasePage() {
  const [activeTab, setActiveTab] = React.useState<"storefront" | "ui" | "layout" | "feedback">("storefront");
  const [quantity, setQuantity] = React.useState(2);

  // Define navigation slots for the mobile shell
  const bottomNavSlots = [
    { 
      icon: <Sparkles className="h-5 w-5" />, 
      label: "Showcase", 
      isActive: true 
    },
    { 
      icon: <GridIcon className="h-5 w-5" />, 
      label: "Slot 2" 
    },
    { 
      icon: <ShoppingBag className="h-5 w-5" />, 
      label: "Slot 3",
      badge: "3"
    },
    { 
      icon: <User className="h-5 w-5" />, 
      label: "Slot 4" 
    },
  ];

  return (
    <Shell
      headerTitle="Design System Showcase"
      headerLeftAction={
        <Button variant="ghost" size="icon" className="-ml-2 h-9 w-9 rounded-full" onClick={() => window.location.href = "/"}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
      }
      headerRightAction={
        <Button variant="ghost" size="icon" className="-mr-2 h-9 w-9 rounded-full" onClick={() => alert("Settings clicked")}>
          <Settings className="h-5 w-5" />
        </Button>
      }
      bottomNavSlots={bottomNavSlots}
    >
      <div className="flex-1 bg-surface/30">
        {/* Intro Section */}
        <Section spacing="sm" className="bg-background px-4 border-b border-border">
          <Stack gap={2}>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                v1.0.0 — Batch 3
              </Badge>
              <span className="text-xs text-text-muted">Storefront Components</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Sivvai Labs Commerce Kit
            </h1>
            <p className="text-xs text-text-secondary">
              Visually verifying the styling tokens, storefront components, and layout primitives.
            </p>
          </Stack>

          <Spacer size={4} />

          {/* Segmented Controller Tab Picker */}
          <div className="flex rounded-lg bg-muted p-0.5 overflow-x-auto">
            <button
              onClick={() => setActiveTab("storefront")}
              className={`flex-1 text-center py-1.5 px-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                activeTab === "storefront"
                  ? "bg-background text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Storefront (Batch 3)
            </button>
            <button
              onClick={() => setActiveTab("ui")}
              className={`flex-1 text-center py-1.5 px-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                activeTab === "ui"
                  ? "bg-background text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              UI Primitives
            </button>
            <button
              onClick={() => setActiveTab("layout")}
              className={`flex-1 text-center py-1.5 px-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                activeTab === "layout"
                  ? "bg-background text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Layout
            </button>
            <button
              onClick={() => setActiveTab("feedback")}
              className={`flex-1 text-center py-1.5 px-2 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                activeTab === "feedback"
                  ? "bg-background text-text-primary shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Feedback Views
            </button>
          </div>
        </Section>

        {/* Tab 0: Storefront Components (Batch 3) */}
        {activeTab === "storefront" && (
          <div className="p-4 space-y-6">
            {/* 1. Price Component */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold">1. Price Component</CardTitle>
                <CardDescription className="text-[11px]">Supports sizing, sale prices, compare-at strikethrough, and currency localization.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="space-y-2">
                  <span className="text-[10px] text-text-muted font-mono uppercase block">Standard & Compare-at Prices</span>
                  <div className="flex flex-wrap gap-4 items-center">
                    <Price amount={25000} originalAmount={32000} size="sm" />
                    <Price amount={25000} originalAmount={32000} size="md" />
                    <Price amount={25000} originalAmount={32000} size="lg" />
                    <Price amount={25000} originalAmount={32000} size="xl" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. StockBadge Component */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold">2. StockBadge Component</CardTitle>
                <CardDescription className="text-[11px]">Inventory states: In Stock, Low Stock, and Out of Stock.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="flex flex-wrap gap-3 items-center">
                  <StockBadge quantity={20} />
                  <StockBadge quantity={3} />
                  <StockBadge quantity={0} />
                </div>
                <div className="flex flex-wrap gap-3 items-center pt-2">
                  <StockBadge quantity={20} variant="dot" />
                  <StockBadge quantity={3} variant="dot" />
                  <StockBadge quantity={0} variant="dot" />
                </div>
              </CardContent>
            </Card>

            {/* 3. Rating Component */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold">3. Rating Component</CardTitle>
                <CardDescription className="text-[11px]">Star rating supporting full, half, and empty stars (feature-flagged).</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                <Rating rating={4.5} reviewCount={24} size="sm" />
                <Rating rating={4.5} reviewCount={24} size="md" />
                <Rating rating={4.5} reviewCount={24} size="lg" />
              </CardContent>
            </Card>

            {/* 4. Breadcrumb Component */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold">4. Breadcrumb Component</CardTitle>
                <CardDescription className="text-[11px]">Semantic nav with Schema.org JSON-LD BreadcrumbList output.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Breadcrumb
                  items={[
                    { label: "Womenswear", href: "/catalog?category=womenswear" },
                    { label: "Dresses", href: "/catalog?category=dresses" },
                    { label: "Classic Silk Ankara Dress" },
                  ]}
                />
              </CardContent>
            </Card>

            {/* 5. Pagination Component */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold">5. Pagination Component</CardTitle>
                <CardDescription className="text-[11px]">Range calculations with ellipsis for catalog navigation.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Pagination currentPage={4} totalPages={10} basePath="/catalog" />
              </CardContent>
            </Card>

            {/* 6. QuantitySelector Component */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold">6. QuantitySelector Component</CardTitle>
                <CardDescription className="text-[11px]">44px touch targets with keyboard support.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 flex items-center gap-4">
                <QuantitySelector value={quantity} onChange={setQuantity} min={1} max={10} />
                <span className="text-xs text-text-muted font-medium">Selected: {quantity}</span>
              </CardContent>
            </Card>

            {/* 7. EmptyState Component */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold">7. EmptyState Component</CardTitle>
                <CardDescription className="text-[11px]">Generic centered empty state card.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <EmptyState
                  title="No items found"
                  description="We couldn't find any products matching your selected filters."
                  action={{ label: "Clear Filters", href: "/catalog" }}
                />
              </CardContent>
            </Card>

            {/* 8. ProductCardSkeleton & 9. ProductCard */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold">8 & 9. ProductCard & Skeleton</CardTitle>
                <CardDescription className="text-[11px]">Individual cards and animated loading state.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <ProductCard product={mockProduct} onQuickAdd={(p) => alert(`Quick added ${p.name}`)} />
                  <ProductCardSkeleton />
                </div>
              </CardContent>
            </Card>

            {/* 10. ProductGrid Component */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold">10. ProductGrid Component</CardTitle>
                <CardDescription className="text-[11px]">Responsive 2 / 3 / 4 column grid wrapper.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <ProductGrid
                  products={[mockProduct, mockProduct2]}
                  columns={{ mobile: 2, tablet: 2, desktop: 2 }}
                  onQuickAdd={(p) => alert(`Quick added ${p.name}`)}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 1: UI Primitives */}
        {activeTab === "ui" && (
          <div className="p-4 space-y-6">
            {/* Typography Section */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  Typography Scale
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Leverages Tailwind defaults mapped to semantic scale guidelines.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-4">
                <div className="space-y-1">
                  <span className="text-[9px] text-text-muted font-mono uppercase block">Display (text-5xl)</span>
                  <div className="text-5xl font-extrabold tracking-tight text-text-primary">Display</div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <span className="text-[9px] text-text-muted font-mono uppercase block">Heading XL (text-3xl)</span>
                  <div className="text-3xl font-bold tracking-tight text-text-primary">Heading XL</div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <span className="text-[9px] text-text-muted font-mono uppercase block">Heading L (text-2xl)</span>
                  <div className="text-2xl font-semibold text-text-primary">Heading L</div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <span className="text-[9px] text-text-muted font-mono uppercase block">Body (text-base)</span>
                  <div className="text-base text-text-secondary">Standard body text for descriptions.</div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <span className="text-[9px] text-text-muted font-mono uppercase block">Caption (text-xs)</span>
                  <div className="text-xs text-text-muted">Small caption labels and helper items.</div>
                </div>
              </CardContent>
            </Card>

            {/* Buttons Section */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold">Buttons</CardTitle>
                <CardDescription className="text-[11px]">Interactive button states & sizes.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <Stack gap={2}>
                  <Button variant="default">Default Button</Button>
                  <Button variant="secondary">Secondary Button</Button>
                  <Button variant="outline">Outline Button</Button>
                  <Button variant="destructive">Destructive Button</Button>
                  <Button variant="ghost">Ghost Button</Button>
                  <Button variant="link">Link Button</Button>
                </Stack>
                <Separator className="my-2" />
                <div className="flex flex-wrap gap-2 items-center">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon" className="rounded-full">
                    <Heart className="h-4 w-4 fill-current" />
                  </Button>
                </div>
                <Separator className="my-2" />
                <Button disabled className="w-full">Disabled Button</Button>
              </CardContent>
            </Card>

            {/* Inputs Section */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold">Inputs</CardTitle>
                <CardDescription className="text-[11px]">Form element controls.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <Stack gap={3}>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-text-secondary block">Full Name</label>
                    <Input type="text" placeholder="Enter your full name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-text-secondary block">Password</label>
                    <Input type="password" value="secretpassword" readOnly />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-text-muted block">Disabled Input</label>
                    <Input type="text" placeholder="Not editable" disabled />
                  </div>
                </Stack>
              </CardContent>
            </Card>

            {/* Badges & Separators */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold">Badges</CardTitle>
                <CardDescription className="text-[11px]">Micro-status representations.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">New</Badge>
                  <Badge variant="secondary">In Stock</Badge>
                  <Badge variant="outline">Pre-Order</Badge>
                  <Badge variant="destructive">Sold Out</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Skeleton Section */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold">Skeletons</CardTitle>
                <CardDescription className="text-[11px]">Used for progressive load state indicators.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-2 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 2: Layout Primitives */}
        {activeTab === "layout" && (
          <div className="p-4 space-y-6">
            {/* Containers & Sections */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold">Containers & Sections</CardTitle>
                <CardDescription className="text-[11px]">Visual representation of boundary controls.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <div className="border border-dashed border-border p-2 text-center text-xs bg-muted/40 rounded">
                  <Container size="sm">
                    <span className="font-mono text-[10px]">{"Container (size='sm') inside Section"}</span>
                  </Container>
                </div>
                <div className="border border-dashed border-border p-2 text-center text-xs bg-muted/40 rounded">
                  <Container size="md">
                    <span className="font-mono text-[10px]">{"Container (size='md') inside Section"}</span>
                  </Container>
                </div>
              </CardContent>
            </Card>

            {/* Stacks */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold">{"Stack (direction='row', justify='between')"}</CardTitle>
                <CardDescription className="text-[11px]">Align items cleanly without boilerplate flex layout styles.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-3">
                <Stack direction="row" justify="between" align="center" className="bg-muted/40 p-2.5 rounded-lg border border-border">
                  <span className="text-xs text-text-primary font-medium">Product Item</span>
                  <Badge variant="secondary">₦25,000</Badge>
                </Stack>
                <Stack direction="col" gap={2} className="bg-muted/40 p-2.5 rounded-lg border border-border">
                  <span className="text-[10px] text-text-muted font-bold">VERTICAL STACK (gap=2)</span>
                  <div className="h-6 bg-accent/10 border border-accent/20 rounded flex items-center justify-center text-[10px]">Block 1</div>
                  <div className="h-6 bg-accent/10 border border-accent/20 rounded flex items-center justify-center text-[10px]">Block 2</div>
                </Stack>
              </CardContent>
            </Card>

            {/* Grids */}
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold">Grid Primitives</CardTitle>
                <CardDescription className="text-[11px]">Responsive, standard column sizing structures.</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Grid cols={2} gap={2}>
                  <div className="border border-border p-3 text-center rounded-lg bg-background text-xs font-semibold">Grid Col 1</div>
                  <div className="border border-border p-3 text-center rounded-lg bg-background text-xs font-semibold">Grid Col 2</div>
                  <div className="border border-border p-3 text-center rounded-lg bg-background text-xs font-semibold">Grid Col 3</div>
                  <div className="border border-border p-3 text-center rounded-lg bg-background text-xs font-semibold">Grid Col 4</div>
                </Grid>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 3: Feedback Views */}
        {activeTab === "feedback" && (
          <div className="p-4 space-y-6">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>Progressive State Views</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => alert("Simulating progressive load refresh...")}>
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Inline demonstrations of shared user layout feedback overlays.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-8">
                {/* Inline loading view wrapper */}
                <div className="border border-border rounded-lg bg-background overflow-hidden relative">
                  <div className="bg-muted px-3 py-1.5 border-b border-border text-[9px] font-mono text-text-secondary">
                    Loading Skeleton View
                  </div>
                  <LoadingView />
                </div>

                {/* Inline coming soon view wrapper */}
                <div className="border border-border rounded-lg bg-background overflow-hidden relative">
                  <div className="bg-muted px-3 py-1.5 border-b border-border text-[9px] font-mono text-text-secondary">
                    Coming Soon Stub View
                  </div>
                  <ComingSoonView 
                    featureName="Checkout Pipeline" 
                    description="Our checkout pipeline is coming in Step 3. You can review this stub in the layout shell."
                  />
                </div>

                {/* Inline error view wrapper */}
                <div className="border border-border rounded-lg bg-background overflow-hidden relative">
                  <div className="bg-muted px-3 py-1.5 border-b border-border text-[9px] font-mono text-text-secondary">
                    Error View
                  </div>
                  <ErrorView 
                    title="Database Connection Fail" 
                    description="Could not load storefront items. Tap below to reload request." 
                    onRetry={() => alert("Retrying content fetch...")}
                  />
                </div>

                {/* Inline 404 view wrapper */}
                <div className="border border-border rounded-lg bg-background overflow-hidden relative">
                  <div className="bg-muted px-3 py-1.5 border-b border-border text-[9px] font-mono text-text-secondary">
                    404 NotFound View
                  </div>
                  <NotFoundView 
                    title="Receipt Not Found"
                    description="We could not find the purchase order ID matching this URL query string."
                    actionHref="/showcase"
                    actionText="Back to Showcase"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Shell>
  );
}
