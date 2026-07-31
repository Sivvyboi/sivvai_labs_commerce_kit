/**
 * components/admin/dashboard/RevenueChart.tsx
 *
 * Hand-rolled SVG bar chart for weekly revenue.
 * No chart library — zero bundle cost.
 * Server Component — data passed as props.
 */

import * as React from "react";

interface WeekBar {
  week: string;
  revenue: number;
}

interface RevenueChartProps {
  data: WeekBar[];
  currency?: string;
}

function formatRevenue(amount: number, currency: string): string {
  if (amount === 0) return `${currency}0`;
  if (amount >= 1_000_000) return `${currency}${(amount / 100_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${currency}${(amount / 100_000).toFixed(0)}k`;
  // Assume minor units (kobo / cents)
  return `${currency}${(amount / 100).toFixed(0)}`;
}

export function RevenueChart({ data, currency = "₦" }: RevenueChartProps) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  const CHART_HEIGHT = 120;
  const BAR_WIDTH = 28;
  const BAR_GAP = 8;
  const CHART_WIDTH = data.length * (BAR_WIDTH + BAR_GAP) - BAR_GAP;

  return (
    <div
      className="rounded-[var(--kit-radius-lg)] border border-[var(--kit-border)] bg-[var(--kit-card)] p-5 shadow-[var(--kit-shadow-sm)]"
      aria-label="Weekly revenue chart"
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-[var(--kit-text-secondary)]">Weekly Revenue</p>
        <p className="text-xs text-[var(--kit-text-muted)]">Last 8 weeks</p>
      </div>

      {data.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-[var(--kit-text-muted)]">
          No revenue data yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <svg
            width={CHART_WIDTH}
            height={CHART_HEIGHT + 32}
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + 32}`}
            className="w-full"
            role="img"
            aria-label="Bar chart showing weekly revenue"
          >
            {data.map((bar, idx) => {
              const barHeight = maxRevenue > 0 ? (bar.revenue / maxRevenue) * CHART_HEIGHT : 0;
              const x = idx * (BAR_WIDTH + BAR_GAP);
              const y = CHART_HEIGHT - barHeight;
              const isLatest = idx === data.length - 1;

              return (
                <g key={bar.week}>
                  {/* Bar */}
                  <rect
                    x={x}
                    y={y}
                    width={BAR_WIDTH}
                    height={barHeight}
                    rx={4}
                    fill={isLatest ? "var(--kit-accent)" : "var(--kit-accent)"}
                    opacity={isLatest ? 1 : 0.35}
                  />
                  {/* Week label */}
                  <text
                    x={x + BAR_WIDTH / 2}
                    y={CHART_HEIGHT + 18}
                    textAnchor="middle"
                    fontSize={9}
                    fill="var(--kit-text-muted)"
                    fontFamily="var(--kit-font-sans)"
                  >
                    {bar.week}
                  </text>
                  {/* Value label on hover — shown as title for accessibility */}
                  <title>{`${bar.week}: ${formatRevenue(bar.revenue, currency)}`}</title>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Legend row */}
      <div className="mt-3 flex items-center gap-3">
        <span className="flex h-2.5 w-2.5 rounded-full bg-[var(--kit-accent)]" />
        <span className="text-xs text-[var(--kit-text-muted)]">Revenue (minor units)</span>
      </div>
    </div>
  );
}
