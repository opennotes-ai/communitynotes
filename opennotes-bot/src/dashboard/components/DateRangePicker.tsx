import React, { useState } from 'react';

interface DateRange {
  start: Date;
  end: Date;
}

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (dateRange: DateRange) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  dateRange,
  onDateRangeChange
}) => {
  const [isCustom, setIsCustom] = useState(false);

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const handlePresetSelect = (preset: string) => {
    const now = new Date();
    let start: Date;

    switch (preset) {
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        setIsCustom(true);
        return;
    }

    setIsCustom(false);
    onDateRangeChange({ start, end: now });
  };

  const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
    const newDate = new Date(value);
    const newRange = {
      ...dateRange,
      [field]: newDate
    };

    if (newRange.start <= newRange.end) {
      onDateRangeChange(newRange);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-700">
        Time Period
      </label>

      <div className="flex flex-col space-y-2">
        {/* Preset buttons */}
        <div className="flex flex-wrap gap-1">
          {[
            { label: '7D', value: '7d' },
            { label: '30D', value: '30d' },
            { label: '90D', value: '90d' },
            { label: '1Y', value: '1y' },
            { label: 'Custom', value: 'custom' }
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => handlePresetSelect(value)}
              className={`px-2 py-1 text-xs rounded ${
                (value === 'custom' && isCustom) ||
                (value !== 'custom' && !isCustom &&
                  Math.abs(dateRange.start.getTime() - (new Date().getTime() - parseInt(value) * 24 * 60 * 60 * 1000)) < 24 * 60 * 60 * 1000)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {isCustom && (
          <div className="flex space-x-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">From</label>
              <input
                type="date"
                value={formatDateForInput(dateRange.start)}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                className="block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">To</label>
              <input
                type="date"
                value={formatDateForInput(dateRange.end)}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};