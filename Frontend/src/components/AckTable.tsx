import { useState } from 'react';
import { Clock, Copy } from 'lucide-react';

interface AckTableProps {
  data: any[];
}

export function AckTable({ data }: AckTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyRequestId = (requestId: string) => {
    navigator.clipboard.writeText(requestId);
    setCopiedId(requestId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h4 className="font-medium text-gray-900 dark:text-white">
          ACK Stream <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">/async</span>
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Immediate acknowledgments
        </p>
      </div>

      {data.length === 0 ? (
        <div className="p-8 text-center flex-1 flex flex-col items-center justify-center">
          <Clock className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2 opacity-50" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No ACKs yet
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
                    Request ID
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    ACK
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      #{item.cycle}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => copyRequestId(item.requestId)}
                        className="flex items-center gap-1.5 text-xs font-mono text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors group"
                        title="Click to copy"
                      >
                        <span className="max-w-[120px] truncate">{item.requestId}</span>
                        <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        {copiedId === item.requestId && (
                          <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                        )}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-900 dark:text-white whitespace-nowrap">
                      {item.ackTime}ms
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
