# Design System & UI Foundation

This document defines the **Sivvai Labs Commerce Kit** UI Foundation and Design System. It serves as a visual and functional reference for all components, styles, layout primitives, and accessibility standards within the framework.

---

## 1. Architectural Layers

To ensure scale, component structure is split into three distinct namespaces under `components/`:

```text
components/
├── ui/          # Low-level primitives wrapped from Radix UI (pure visual/interactive helpers)
├── layout/      # Layout blocks (Header, Footer, Container, Stack, Grid, App Shell)
├── shared/      # Reusable feature-independent overlays (LoadingView, NotFoundView, ComingSoonView)
```

Commerce features (e.g. products, cart, checkout) are separated into `features/` directory layout:

```text
features/
└── products/
    ├── components/    # Feature-specific components
    ├── hooks/
    └── types/
```

---

## 2. Design Tokens & CSS Custom Properties

All styling conforms to CSS variables declared in `app/globals.css`, mapped inline through Tailwind CSS v4's `@theme` compiler directive.

### Colors

| Token Name | Light Value | Dark Value | CSS Custom Property |
| :--- | :--- | :--- | :--- |
| **Primary** | `#0f0f0f` | `#fafafa` | `var(--kit-primary)` |
| **Secondary** | `#f4f4f4` | `#1a1a1a` | `var(--kit-secondary)` |
| **Accent** | `#6d28d9` | `#7c3aed` | `var(--kit-accent)` |
| **Background** | `#ffffff` | `#0a0a0a` | `var(--kit-bg)` |
| **Surface** | `#f8f8f8` | `#141414` | `var(--kit-surface)` |
| **Card** | `#ffffff` | `#1c1c1e` | `var(--kit-card)` |
| **Border** | `#e5e5e5` | `#262626` | `var(--kit-border)` |
| **Danger** | `#dc2626` | `#ef4444` | `var(--kit-danger)` |

### Text Semantic Colors

*   `text-text-primary` (`var(--kit-text-primary)`): Body text, titles, prominent typography.
*   `text-text-secondary` (`var(--kit-text-secondary)`): Descriptive text, metadata, labels.
*   `text-text-muted` (`var(--kit-text-muted)`): Disabled states, inactive navigation labels, placeholders.

### Shadows & Radii

*   **Shadows**: `shadow-sm` (micro elements), `shadow-md` (standard cards), `shadow-lg` (drawers/sheets).
*   **Borders**: `rounded-sm` (3px / buttons), `rounded-md` (10px / cards/inputs), `rounded-lg` (16px / banners/outer nodes).

---

## 3. Typography Guidelines

Instead of custom utility classes, the typography scale relies directly on Tailwind's defaults. Map the hierarchy using these classes:

| Scale Level | Tailwind Class Combo | Usage Example |
| :--- | :--- | :--- |
| **Display** | `text-5xl font-extrabold tracking-tight` | Promo Hero headings, discount callouts |
| **Heading XL** | `text-3xl font-bold tracking-tight` | Page-level main headers (`h1`) |
| **Heading L** | `text-2xl font-semibold` | Section titles (`h2`) |
| **Heading M** | `text-lg font-bold leading-tight` | Product card titles |
| **Heading S** | `text-sm font-semibold uppercase tracking-wider` | Tab sections, headers |
| **Body Large** | `text-base` | Content descriptions |
| **Body** | `text-sm` | Default body copy, helper text |
| **Body Small** | `text-[11px] leading-relaxed` | Micro info metadata |
| **Caption** | `text-[10px] uppercase font-bold tracking-wider` | Overlays, flags, indicators |

---

## 4. Layout Primitives (`components/layout/`)

These primitives remove repetitive Tailwind CSS flex and grid layout utility classes across the app:

*   **`<Container>`**: Limits horizontal boundary width. Default size `md` (`max-w-lg`) acts as the standard viewport frame width. Centered using `mx-auto` with responsive padding `px-4`.
*   **`<Section>`**: Separates content blocks with vertical padding scales (`spacing="sm" | "md" | "lg" | "xl"`), optionally rendering custom boundary border dividers.
*   **`<Stack>`**: Creates responsive flex direction rows or columns with custom `gap` values (`0` to `16`), horizontal/vertical justification, items alignments, and wrapping.
*   **`<Grid>`**: Represents CSS Grid boxes, with responsive columns (`cols`, `colsSm`, `colsMd`, `colsLg`).
*   **`<Spacer>`**: Inserts empty block height or width spacing on specific layout tracks.

---

## 5. UI Primitives (`components/ui/`)

Tailwind v4-optimized shadcn primitives:

1.  **`Button`**: Supports standard variants (`default`, `secondary`, `outline`, `destructive`, `ghost`, `link`) and sizing triggers (`sm`, `default`, `lg`, `icon`), handling state disabled flags correctly.
2.  **`Input`**: Text entries featuring standard border radius, placeholder styling, disabled behaviors, and custom focus outlines.
3.  **`Card`**: Styled containment surface using `bg-card` and standard box-shadow parameters.
4.  **`Badge`**: Text labels representing inventory states, product types, and order updates.
5.  **`Skeleton`**: Pulsing loading bars used for progressive view rendering.
6.  **`Separator`**: Content dividing lines.

---

## 6. Mobile Shell Layout (`components/layout/`)

The mobile shell establishes a 512px max-width boundary (`max-w-lg`) that mimics a native application:

*   **`<Shell>`**: Coordinates the main viewport container. Vertically aligns the page and offsets the layout by adding `pb-20` to prevent elements from getting obscured behind the fixed navigation bar.
*   **`<Header>`**: Sticky top bar containing notch/safe-area top offsets (`pt-[env(safe-area-inset-top)]`), left navigation triggers, page header titles, and settings/cart actions.
*   **`<BottomNavigation>`**: Fixed navigation shell utilizing a clean bottom inset layout. Maps up to 5 generic interaction slots.
*   **`<Footer>`**: Semantic centered footer for support and copyright.

---

## 7. Accessibility Standards (WCAG AA)

Every component must adhere to these directives:

*   **Touch Targets**: Interactive items (buttons, tab list entries, form inputs) must feature a minimum physical height and width of **`44px`** to support touch targets on mobile (WCAG 2.5.5).
*   **Keyboard Navigation**: Tab indexing must cycle in logical sequential order. All interactive components must be focusable.
*   **Focus Rings**: Always use high-contrast focus indicators: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent` or equivalent visible rings.
*   **Contrast Standards**: Keep text readable, ensuring contrast ratios exceed `4.5:1` (WCAG 1.4.3). Avoid placing low-contrast text on accent surfaces.
