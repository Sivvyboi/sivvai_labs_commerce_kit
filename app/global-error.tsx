"use client";

/**
 * app/global-error.tsx
 *
 * Global error fallback — catches crashes inside the root layout itself.
 *
 * MUST include its own <html> and <body> tags because it REPLACES the
 * root layout when active (the root layout is what crashed).
 *
 * This is the last line of defence. It should be as simple as possible
 * and must NOT import anything that might itself throw (e.g. no config
 * imports that call process.env at module evaluation time).
 *
 * Reference:
 * → node_modules/next/dist/docs/01-app/01-getting-started/10-error-handling.md
 *   (section: "Global errors")
 */

interface GlobalErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export default function GlobalError({ unstable_retry }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          display: "flex",
          minHeight: "100dvh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "2rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#0a0a0a",
          color: "#fafafa",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
          Critical error
        </h1>
        <p style={{ fontSize: "0.875rem", opacity: 0.6, margin: 0 }}>
          Something went seriously wrong. Please refresh the page.
        </p>
        <button
          onClick={unstable_retry}
          style={{
            padding: "0.625rem 1.25rem",
            borderRadius: "0.625rem",
            border: "none",
            background: "#fafafa",
            color: "#0a0a0a",
            fontWeight: 600,
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
