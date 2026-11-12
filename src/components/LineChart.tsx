import { useId, useMemo } from 'react';
import type { TrendPoint } from '../lib/stats';
import { shortDate } from '../lib/date';

interface LineChartProps {
  points: TrendPoint[];
  valueFormatter: (value: number) => string;
  emptyText?: string;
}

interface Point {
  x: number;
  y: number;
  value: number;
  date: string;
}

function smoothPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    path += ` C ${midX} ${current.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
  }
  return path;
}

export function LineChart({ points, valueFormatter, emptyText = '暂无数据' }: LineChartProps) {
  const gradientId = useId().replace(/:/g, '');
  const geometry = useMemo(() => {
    if (!points.length) return null;
    const width = 360;
    const height = 180;
    const plotLeft = 12;
    const plotRight = 348;
    const plotTop = 18;
    const plotBottom = 136;
    const values = points.map((point) => point.value);
    let min = Math.min(...values);
    let max = Math.max(...values);
    if (min === max) {
      const pad = Math.abs(min) * 0.1 || 1;
      min -= pad;
      max += pad;
    }
    const range = max - min;
    const xFor = (index: number) =>
      points.length === 1
        ? (plotLeft + plotRight) / 2
        : plotLeft + (index / (points.length - 1)) * (plotRight - plotLeft);
    const yFor = (value: number) =>
      plotBottom - ((value - min) / range) * (plotBottom - plotTop);
    const screenPoints: Point[] = points.map((point, index) => ({
      x: xFor(index),
      y: yFor(point.value),
      value: point.value,
      date: point.date,
    }));
    const path = smoothPath(screenPoints);
    const areaPath = screenPoints.length
      ? `${path} L ${screenPoints[screenPoints.length - 1].x} ${plotBottom} L ${
          screenPoints[0].x
        } ${plotBottom} Z`
      : '';
    const labelIndexes = points.length <= 2 ? points.map((_, index) => index) : [0, Math.floor((points.length - 1) / 2), points.length - 1];
    return {
      width,
      height,
      plotLeft,
      plotRight,
      plotTop,
      plotBottom,
      min,
      max,
      screenPoints,
      path,
      areaPath,
      labelIndexes: [...new Set(labelIndexes)],
    };
  }, [points]);

  if (!geometry) {
    return <div className="chart-empty">{emptyText}</div>;
  }

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${geometry.width} ${geometry.height}`} role="img" aria-label="趋势图">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c8f45c" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#c8f45c" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((ratio) => {
          const y =
            geometry.plotTop + ratio * (geometry.plotBottom - geometry.plotTop);
          return (
            <line
              key={ratio}
              x1={geometry.plotLeft}
              y1={y}
              x2={geometry.plotRight}
              y2={y}
              stroke="rgba(255,255,255,0.07)"
              strokeWidth="1"
            />
          );
        })}
        <path d={geometry.areaPath} fill={`url(#${gradientId})`} />
        <path
          d={geometry.path}
          fill="none"
          stroke="#c8f45c"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {geometry.screenPoints.map((point) => (
          <circle
            key={`${point.date}-${point.x}`}
            cx={point.x}
            cy={point.y}
            r="3.2"
            fill="#0d1015"
            stroke="#c8f45c"
            strokeWidth="2"
          />
        ))}
        <text
          x={geometry.plotLeft}
          y={geometry.plotTop - 6}
          className="chart-axis-value"
          textAnchor="start"
        >
          {valueFormatter(geometry.max)}
        </text>
        <text
          x={geometry.plotLeft}
          y={geometry.plotBottom + 16}
          className="chart-axis-value"
          textAnchor="start"
        >
          {valueFormatter(geometry.min)}
        </text>
        {geometry.labelIndexes.map((index) => {
          const point = geometry.screenPoints[index];
          if (!point) return null;
          const anchor =
            index === 0 ? 'start' : index === geometry.screenPoints.length - 1 ? 'end' : 'middle';
          return (
            <text
              key={`label-${point.date}-${index}`}
              x={point.x}
              y={geometry.height - 8}
              className="chart-axis-date"
              textAnchor={anchor}
            >
              {shortDate(point.date)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
