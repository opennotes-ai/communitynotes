import React from 'react';

interface TimeSeriesData {
  timestamp: Date;
  value: number;
  metadata?: any;
}

interface ChartContainerProps {
  title: string;
  data: TimeSeriesData[];
  type: 'line' | 'bar' | 'area';
  height?: number;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  data,
  type,
  height = 200
}) => {
  const getMaxValue = () => {
    return Math.max(...data.map(d => d.value), 0);
  };

  const getMinValue = () => {
    return Math.min(...data.map(d => d.value), 0);
  };

  const normalizeValue = (value: number) => {
    const max = getMaxValue();
    const min = getMinValue();
    const range = max - min || 1;
    return ((value - min) / range) * (height - 40) + 20;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(1);
  };

  if (data.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6" style={{ height }}>
        <h4 className="text-sm font-medium text-gray-900 mb-4">{title}</h4>
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  const chartWidth = 600;
  const chartHeight = height - 80;
  const pointSpacing = chartWidth / Math.max(data.length - 1, 1);

  return (
    <div className="bg-gray-50 rounded-lg p-6" style={{ minHeight: height }}>
      <h4 className="text-sm font-medium text-gray-900 mb-4">{title}</h4>

      <div className="relative overflow-x-auto">
        <svg
          width={chartWidth}
          height={chartHeight + 40}
          className="w-full"
          style={{ minWidth: '600px' }}
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="50" height="40" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
            const y = chartHeight - (ratio * (chartHeight - 40)) + 20;
            const value = getMinValue() + (getMaxValue() - getMinValue()) * ratio;
            return (
              <g key={index}>
                <line
                  x1="0"
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x="-10"
                  y={y + 4}
                  fontSize="10"
                  fill="#6b7280"
                  textAnchor="end"
                >
                  {formatValue(value)}
                </text>
              </g>
            );
          })}

          {/* Chart line/bars */}
          {type === 'line' && (
            <path
              d={data.map((point, index) => {
                const x = index * pointSpacing;
                const y = chartHeight - normalizeValue(point.value) + 20;
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
            />
          )}

          {type === 'area' && (
            <path
              d={[
                ...data.map((point, index) => {
                  const x = index * pointSpacing;
                  const y = chartHeight - normalizeValue(point.value) + 20;
                  return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                }),
                `L ${(data.length - 1) * pointSpacing} ${chartHeight + 20}`,
                `L 0 ${chartHeight + 20}`,
                'Z'
              ].join(' ')}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="#3b82f6"
              strokeWidth="2"
            />
          )}

          {type === 'bar' && data.map((point, index) => {
            const x = index * pointSpacing - 10;
            const y = chartHeight - normalizeValue(point.value) + 20;
            const barHeight = normalizeValue(point.value) - 20;
            return (
              <rect
                key={index}
                x={x}
                y={y}
                width="20"
                height={barHeight}
                fill="#3b82f6"
                opacity="0.8"
              />
            );
          })}

          {/* Data points */}
          {type === 'line' && data.map((point, index) => {
            const x = index * pointSpacing;
            const y = chartHeight - normalizeValue(point.value) + 20;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill="#3b82f6"
                className="hover:r-4 transition-all cursor-pointer"
              >
                <title>
                  {formatDate(point.timestamp)}: {formatValue(point.value)}
                  {point.metadata && Object.entries(point.metadata).map(([key, value]) =>
                    `\n${key}: ${value}`
                  ).join('')}
                </title>
              </circle>
            );
          })}

          {/* X-axis labels */}
          {data.filter((_, index) => index % Math.max(1, Math.floor(data.length / 8)) === 0).map((point, index, filteredData) => {
            const originalIndex = data.indexOf(point);
            const x = originalIndex * pointSpacing;
            const y = chartHeight + 35;
            return (
              <text
                key={originalIndex}
                x={x}
                y={y}
                fontSize="10"
                fill="#6b7280"
                textAnchor="middle"
              >
                {formatDate(point.timestamp)}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
        <span>Period: {formatDate(data[0].timestamp)} - {formatDate(data[data.length - 1].timestamp)}</span>
        <span>Total data points: {data.length}</span>
      </div>
    </div>
  );
};