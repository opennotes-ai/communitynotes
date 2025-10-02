import React from 'react';

interface MetricsCardProps {
  title: string;
  value: string;
  icon: string;
  trend?: 'up' | 'down' | 'stable';
  subtitle?: string;
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  icon,
  trend,
  subtitle
}) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <span className="text-green-500 text-sm">↗️</span>;
      case 'down':
        return <span className="text-red-500 text-sm">↘️</span>;
      case 'stable':
        return <span className="text-gray-500 text-sm">→</span>;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
      default:
        return 'text-gray-900';
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-center mt-1">
            <span className={`text-2xl font-bold ${getTrendColor()}`}>
              {value}
            </span>
            {trend && (
              <span className="ml-2">
                {getTrendIcon()}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className="text-2xl ml-3">
          {icon}
        </div>
      </div>
    </div>
  );
};