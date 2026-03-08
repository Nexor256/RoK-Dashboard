/**
 * Tiny SVG sparkline component for inline trend visualization.
 * Renders a small line chart showing the data point progression.
 */
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({
  data,
  width = 48,
  height = 18,
  className = "",
}: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 1;

  const points = data.map((value, i) => {
    const x = pad + (i / (data.length - 1)) * (width - pad * 2);
    const y = pad + (1 - (value - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  });

  const isUp = data[data.length - 1] >= data[0];
  const strokeColor = isUp ? "#10b981" : "#ef4444";

  // Gradient fill under the line
  const lastPoint = points[points.length - 1];
  const firstPoint = points[0];
  const areaPath = `M${points.join(" L")} L${lastPoint.split(",")[0]},${height - pad} L${firstPoint.split(",")[0]},${height - pad} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`inline-block align-middle ${className}`}
    >
      <defs>
        <linearGradient id={`sparkGrad-${isUp ? "up" : "down"}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill={`url(#sparkGrad-${isUp ? "up" : "down"})`}
      />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot on last data point */}
      <circle
        cx={parseFloat(lastPoint.split(",")[0])}
        cy={parseFloat(lastPoint.split(",")[1])}
        r="2"
        fill={strokeColor}
      />
    </svg>
  );
}
