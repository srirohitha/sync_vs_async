import { Loader2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface SyncTableProps {
  data: any[];
}

export function SyncTable({ data }: SyncTableProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h4 className="font-medium text-gray-900 dark:text-white">
          Sync Execution <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">/sync</span>
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Sequential processing
        </p>
      </div>
      
      {data.length === 0 ? (
        <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2 opacity-50" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Waiting for demo...
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto flex-1">
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    #
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Latency
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Hash
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.map((item, index) => (
                  <tr
                    key={index}
                    className={`transition-colors ${
                      item.status === 'running'
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      #{item.cycle}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                      {item.latency ? `${item.latency}ms` : '—'}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono text-gray-600 dark:text-gray-400">
                      {item.hash ? (
                        <span className="truncate block max-w-[140px]" title={item.hash}>
                          {item.hash}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
