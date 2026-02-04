import React from 'react';

interface InputValuesCardProps {
  inputs: string[];
}

export function InputValuesCard({ inputs }: InputValuesCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Input values</p>
        <span className="text-xs text-gray-500 dark:text-gray-400">{inputs.length}</span>
      </div>
      {inputs.length === 0 ? (
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">—</p>
      ) : (
        <div className="mt-3 max-h-[360px] overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/30 p-3">
          <div className="space-y-2">
            {inputs.map((value, index) => (
              <div key={`${value}-${index}`} className="flex items-start gap-2 min-w-0">
                <span className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0">
                  #{index + 1}
                </span>
                <span
                  className="text-[12px] font-mono text-gray-700 dark:text-gray-300 truncate"
                  title={value}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
