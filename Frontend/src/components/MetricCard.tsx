import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon?: React.ReactNode;
  trend?: 'positive' | 'negative' | 'neutral';
}

export function MetricCard({ label, value, sublabel, icon, trend }: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{label}</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
          {sublabel && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">{sublabel}</p>
          )}
        </div>
        {icon && (
          <div className="text-gray-400 dark:text-gray-500">
            {icon}
          </div>
        )}
        {trend && (
          <div>
            {trend === 'positive' && (
              <TrendingUp className="w-4 h-4 text-green-500" />
            )}
            {trend === 'negative' && (
              <TrendingDown className="w-4 h-4 text-red-500" />
            )}
            {trend === 'neutral' && (
              <Minus className="w-4 h-4 text-gray-400" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
