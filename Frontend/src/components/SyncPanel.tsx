import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import { MetricCard } from './MetricCard';

export interface SyncPanelProps {
  data: any[];
  totalCycles: number;
  totalRuntimeMs?: number | null;
}

export function SyncPanel({ data, totalCycles, totalRuntimeMs }: SyncPanelProps) {
  const completedCount = data.filter(d => d.status === 'done').length;
  const failedCount = data.filter(d => d.status === 'failed').length;
  const progress = totalCycles > 0 ? (completedCount / totalCycles) * 100 : 0;

  // Calculate latency stats
  const latencies = data.filter(d => d.latency !== null).map(d => d.latency);
  const p50 = calculatePercentile(latencies, 50);
  const p95 = calculatePercentile(latencies, 95);
  const p99 = calculatePercentile(latencies, 99);

  const totalRuntime = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) : 0;
  const runtimeValueMs = totalRuntimeMs ?? totalRuntime;
  const runtimeLabel = totalRuntimeMs != null ? 'Elapsed' : 'Cumulative';

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Synchronous API
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
            /sync
          </span>
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Sequential processing - each request blocks until complete
        </p>
      </div>

      {/* Progress Bar */}
      {data.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Overall Progress
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {completedCount} / {totalCycles}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="Total Requests"
          value={data.length.toString()}
          icon={<Clock className="w-4 h-4" />}
          trend={data.length > 0 ? 'neutral' : undefined}
        />
        <MetricCard
          label="Success / Failed"
          value={`${completedCount} / ${failedCount}`}
          icon={completedCount > failedCount ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          trend={failedCount === 0 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="p50 Latency"
          value={p50 ? `${p50}ms` : '—'}
          sublabel="Median"
        />
        <MetricCard
          label="p95 Latency"
          value={p95 ? `${p95}ms` : '—'}
          sublabel="95th percentile"
        />
        <MetricCard
          label="p99 Latency"
          value={p99 ? `${p99}ms` : '—'}
          sublabel="99th percentile"
        />
        <MetricCard
          label="Total Runtime"
          value={runtimeValueMs ? `${(runtimeValueMs / 1000).toFixed(2)}s` : '—'}
          sublabel={runtimeLabel}
        />
      </div>

      {/* Tables are rendered in the main layout for alignment */}
    </div>
  );
}

function calculatePercentile(values: number[], percentile: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return Math.round(sorted[index]);
}
