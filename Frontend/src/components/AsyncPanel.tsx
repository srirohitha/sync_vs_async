import { CheckCircle2, XCircle, Zap, AlertTriangle } from 'lucide-react';
import { MetricCard } from './MetricCard';
import {
  HASH_ALGORITHMS,
  HASH_ITERATIONS_PER_CYCLE,
  HashAlgorithm,
} from '../lib/hashConfig';

export interface AsyncPanelProps {
  ackData: any[];
  callbackData: any[];
  difficulty: number;
  hashAlgorithm: HashAlgorithm;
  workerConcurrency: number;
  brokerLabel: string;
  totalRuntimeMs?: number | null;
}

export function AsyncPanel({
  ackData,
  callbackData,
  difficulty,
  hashAlgorithm,
  workerConcurrency,
  brokerLabel,
  totalRuntimeMs,
}: AsyncPanelProps) {
  const completedCount = callbackData.filter(d => d.status === 'done').length;
  const failedCount = callbackData.filter(d => d.status === 'failed').length;
  const retryingCount = callbackData.filter(d => d.status === 'retrying').length;

  // Calculate ACK latency stats
  const ackLatencies = ackData.map(d => parseFloat(d.ackTime));
  const avgAckLatency = ackLatencies.length > 0
    ? ackLatencies.reduce((a, b) => a + b, 0) / ackLatencies.length
    : 0;

  // Calculate callback time stats
  const callbackTimes = callbackData.filter(d => d.callbackTime !== null).map(d => d.callbackTime);
  const p50Callback = calculatePercentile(callbackTimes, 50);
  const p95Callback = calculatePercentile(callbackTimes, 95);
  const p99Callback = calculatePercentile(callbackTimes, 99);

  const totalCallbackTime = callbackTimes.length > 0
    ? callbackTimes.reduce((a, b) => a + b, 0)
    : 0;

  const totalRetries = callbackData.reduce((sum, d) => sum + (d.attempts - 1), 0);
  const algorithmLabel =
    HASH_ALGORITHMS.find((algo) => algo.value === hashAlgorithm)?.label ??
    hashAlgorithm.toUpperCase();

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Asynchronous API
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
            /async + callback
          </span>
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Instant ACK, results delivered via callback (out-of-order)
        </p>
      </div>

      {/* Callback Retry Alerts */}
      {totalRetries > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                Callback Retry Events
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {totalRetries} callback{totalRetries > 1 ? 's' : ''} retried • {retryingCount} currently retrying
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tables are rendered in the main layout for alignment */}

      {/* Metrics + Details */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-2 items-start">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <MetricCard
            label="Total Runtime"
            value={
              totalRuntimeMs != null
                ? `${(totalRuntimeMs / 1000).toFixed(2)}s`
                : totalCallbackTime
                ? `${(totalCallbackTime / 1000).toFixed(2)}s`
                : '—'
            }
            icon={<Zap className="w-4 h-4" />}
            sublabel={totalRuntimeMs != null ? 'Elapsed' : 'Cumulative'}
          />
          <MetricCard
            label="Success / Failed"
            value={`${completedCount} / ${failedCount}`}
            icon={completedCount > failedCount ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            trend={failedCount === 0 ? 'positive' : 'negative'}
          />
          <MetricCard
            label="Avg ACK Latency"
            value={avgAckLatency ? `${avgAckLatency.toFixed(2)}ms` : '—'}
            sublabel="Time to acknowledge"
          />
          <MetricCard
            label="p50 Callback Time"
            value={p50Callback ? `${p50Callback}ms` : '—'}
            sublabel="Median processing"
          />
          <MetricCard
            label="p95 Callback Time"
            value={p95Callback ? `${p95Callback}ms` : '—'}
            sublabel="95th percentile"
          />
          <MetricCard
            label="p99 Callback Time"
            value={p99Callback ? `${p99Callback}ms` : '—'}
            sublabel="99th percentile"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm w-full">
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Processing Details</p>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center justify-between">
              <span>Algorithm</span>
              <span className="text-gray-900 dark:text-white font-medium">{algorithmLabel}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span>Difficulty cycles</span>
              <span className="text-gray-900 dark:text-white font-medium">{difficulty}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span>Iterations per cycle</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {HASH_ITERATIONS_PER_CYCLE.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span>Total iterations</span>
              <span className="text-gray-900 dark:text-white font-medium">
                {(difficulty * HASH_ITERATIONS_PER_CYCLE).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span>Broker</span>
              <span className="text-gray-900 dark:text-white font-medium">{brokerLabel}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span>Worker concurrency</span>
              <span className="text-gray-900 dark:text-white font-medium">{workerConcurrency}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function calculatePercentile(values: number[], percentile: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return Math.round(sorted[index]);
}