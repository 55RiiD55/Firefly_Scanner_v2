"use client";

import { useEffect, useId, useMemo, useState } from "react";

type TrendPoint = { timestamp: number; value: number };

// Shared reference axes keep positive and negative scenario charts comparable.
const COMMON_WINDOW_SECONDS = 340;
const COMMON_CPS_RANGE = { min: 0, max: 2000 } as const;
const COMMON_DOSE_RATE_RANGE = { min: 0.5, max: 9.99 } as const;

interface CompactTrendChartProps {
  value: number;
  unit: string;
  color: string;
  precision?: number;
  maxPoints?: number;
  windowSeconds?: number;
  min?: number;
  max?: number;
}

export default function CompactTrendChart({
  value,
  unit,
  color,
  precision = 0,
  maxPoints = 240,
  windowSeconds = 340,
  min,
  max,
}: CompactTrendChartProps) {
  const [history, setHistory] = useState<TrendPoint[]>([]);
  const gradientId = useId().replace(/:/g, "");

  useEffect(() => {
    if (!Number.isFinite(value)) return;

    const timestamp = Date.now();
    setHistory((previous) => {
      // Seed every scenario from zero so the trend visibly starts at baseline
      // before moving toward the first actual live reading.
      const startingHistory =
        previous.length === 0
          ? [{ timestamp: timestamp - 1000, value: 0 }]
          : previous;

      return [...startingHistory, { timestamp, value }].slice(
        -Math.max(2, maxPoints),
      );
    });
  }, [value, maxPoints]);

  const normalizedUnit = unit.toLowerCase().replace(/\s/g, "");
  const isCps = normalizedUnit.includes("cps");
  const isDoseRate =
    normalizedUnit.includes("sv/h") || normalizedUnit.includes("dose");

  // Shared fixed scales across positive and negative scenarios.
  const axisMin = isCps
    ? COMMON_CPS_RANGE.min
    : isDoseRate
      ? COMMON_DOSE_RATE_RANGE.min
      : (min ?? 0);
  const axisMax = isCps
    ? COMMON_CPS_RANGE.max
    : isDoseRate
      ? COMMON_DOSE_RATE_RANGE.max
      : (max ?? 1);

  const width = 320;
  const height = 140;
  const leftPad = 30;
  const rightPad = 10;
  const topPad = 10;
  const bottomPad = 22;
  const plotWidth = width - leftPad - rightPad;
  const plotHeight = height - topPad - bottomPad;
  const range = Math.max(axisMax - axisMin, 0.0001);
  // Intentionally fixed: the windowSeconds prop remains accepted for backwards
  // compatibility, but every chart uses the same 340-second X-axis.
  const safeWindowSeconds = COMMON_WINDOW_SECONDS;

  const latestTimestamp = history[history.length - 1]?.timestamp ?? Date.now();

  const points = useMemo(() => {
    return history
      .map((item) => {
        const ageSeconds = (latestTimestamp - item.timestamp) / 1000;
        if (ageSeconds < 0 || ageSeconds > safeWindowSeconds) return null;

        const x =
          width - rightPad - (ageSeconds / safeWindowSeconds) * plotWidth;
        const normalized = Math.max(
          0,
          Math.min(1, (item.value - axisMin) / range),
        );
        const y = topPad + (1 - normalized) * plotHeight;
        return { x, y };
      })
      .filter((point): point is { x: number; y: number } => point !== null);
  }, [
    history,
    latestTimestamp,
    safeWindowSeconds,
    width,
    rightPad,
    plotWidth,
    axisMin,
    range,
    topPad,
    plotHeight,
  ]);

  const linePath = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(" ");

  const areaPath =
    points.length > 1
      ? `${linePath} L ${points[points.length - 1].x} ${topPad + plotHeight} L ${points[0].x} ${topPad + plotHeight} Z`
      : "";

  const latestValue = Number.isFinite(value) ? value.toFixed(precision) : "—";

  const thresholdY = (threshold: number) => {
    const normalized = (threshold - axisMin) / range;
    return topPad + (1 - normalized) * plotHeight;
  };

  const showMinThreshold =
    typeof min === "number" &&
    Number.isFinite(min) &&
    min >= axisMin &&
    min <= axisMax;
  const showMaxThreshold =
    typeof max === "number" &&
    Number.isFinite(max) &&
    max >= axisMin &&
    max <= axisMax;

  const elapsedSeconds =
    history.length > 1
      ? Math.max(0, Math.round((latestTimestamp - history[0].timestamp) / 1000))
      : 0;

  const axisLabel = (number: number) =>
    number.toLocaleString(undefined, {
      minimumFractionDigits: isDoseRate ? 2 : 0,
      maximumFractionDigits: isDoseRate ? 2 : 0,
    });

  return (
    <div className="mt-0 w-full">
      <div className="rounded-md bg-orange-400 p-0.5">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-[130px] w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label={`Live trend chart for ${unit}; fixed Y-axis ${axisLabel(axisMin)} to ${axisLabel(axisMax)} and ${safeWindowSeconds}-second time window`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <rect x="0" y="0" width={width} height={height} fill="#a56529" />

          {Array.from({ length: 16 }).map((_, index) => {
            const x = leftPad + (index / 15) * plotWidth;
            return (
              <line
                key={`vertical-${index}`}
                x1={x}
                y1={topPad}
                x2={x}
                y2={topPad + plotHeight}
                stroke="#e28585"
                strokeWidth="0.5"
                opacity="0.75"
              />
            );
          })}

          {Array.from({ length: 8 }).map((_, index) => {
            const y = topPad + (index / 7) * plotHeight;
            return (
              <line
                key={`horizontal-${index}`}
                x1={leftPad}
                y1={y}
                x2={width - rightPad}
                y2={y}
                stroke="#e28585"
                strokeWidth="0.5"
                opacity="0.75"
              />
            );
          })}

          {/* Scenario thresholds are reference lines only; they do not rescale the chart. */}
          {showMinThreshold && (
            <line
              x1={leftPad}
              y1={thresholdY(min!)}
              x2={width - rightPad}
              y2={thresholdY(min!)}
              stroke="#facc15"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
          )}
          {showMaxThreshold && (
            <line
              x1={leftPad}
              y1={thresholdY(max!)}
              x2={width - rightPad}
              y2={thresholdY(max!)}
              stroke="#fb7185"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
          )}

          {points.length > 1 && (
            <>
              <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
              <path
                d={linePath}
                fill="none"
                stroke="#2CFF05"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                shapeRendering="geometricPrecision"
              />
            </>
          )}

          <text x="3" y={topPad + 8} fontSize="8" fill="#ffffff">
            {axisLabel(axisMax)}
          </text>
          <text x="3" y={topPad + plotHeight - 2} fontSize="8" fill="#ffffff">
            {axisLabel(axisMin)}
          </text>

          <text
            x={width - rightPad}
            y={18}
            textAnchor="end"
            fontSize="10"
            fill="#ffffff"
            fontWeight="600"
          >
            {latestValue} {unit}
          </text>

          <text x={leftPad} y={height - 3} fontSize="8" fill="#ffffff">
            {Math.min(elapsedSeconds, safeWindowSeconds)}s
          </text>
          <text
            x={width - rightPad}
            y={height - 3}
            textAnchor="end"
            fontSize="8"
            fill="#ffffff"
          >
            0s
          </text>
        </svg>
      </div>
    </div>
  );
}
