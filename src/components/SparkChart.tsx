import type { ReactNode } from 'react';

type Point = { x: string; y?: number; secondary?: number };
type Props = { data: Point[]; color?: string; secondaryColor?: string; height?: number; unit?: string; children?: ReactNode };
export function SparkChart({ data, color = '#0891b2', secondaryColor = '#f59e0b', height = 130, unit = '', children }: Props) {
  const values = data.flatMap(point => [point.y, point.secondary]).filter((value): value is number => value != null && Number.isFinite(value));
  if (values.length < 2) return <div className="chart-empty">Chart data unavailable</div>;
  const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1;
  const width = 600; const pad = 18;
  const makePath = (key: 'y' | 'secondary') => data.map((point, index) => {
    const value = point[key]; if (value == null) return '';
    const x = pad + index / Math.max(1, data.length - 1) * (width - pad * 2);
    const y = pad + (max - value) / range * (height - pad * 2);
    return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).filter(Boolean).join(' ');
  return <div className="chart-wrap">
    <div className="chart-range"><span>{max.toFixed(1)}{unit}</span><span>{min.toFixed(1)}{unit}</span></div>
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Trend from ${min.toFixed(1)} to ${max.toFixed(1)} ${unit}`} preserveAspectRatio="none">
      <defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".22"/><stop offset="1" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      {[.25,.5,.75].map(f => <line key={f} x1={pad} x2={width-pad} y1={height*f} y2={height*f} className="grid-line" />)}
      {makePath('y') && <path d={makePath('y')} fill="none" stroke={color} strokeWidth="4" vectorEffect="non-scaling-stroke" strokeLinecap="round" />}
      {makePath('secondary') && <path d={makePath('secondary')} fill="none" stroke={secondaryColor} strokeWidth="3" strokeDasharray="7 6" vectorEffect="non-scaling-stroke" />}
    </svg>
    <div className="chart-labels"><span>{data[0]?.x}</span><span>{data[Math.floor(data.length/2)]?.x}</span><span>{data.at(-1)?.x}</span></div>{children}
  </div>;
}
