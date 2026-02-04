import { Play, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { HASH_ALGORITHMS, HashAlgorithm } from '../lib/hashConfig';

interface CommonControlsProps {
  cycles: number;
  setCycles: (value: number) => void;
  difficulty: number;
  setDifficulty: (value: number) => void;
  hashAlgorithm: HashAlgorithm;
  setHashAlgorithm: (value: HashAlgorithm) => void;
  seedMode: 'auto' | 'manual';
  setSeedMode: (value: 'auto' | 'manual') => void;
  manualSeed: string[];
  setManualSeed: (value: string[]) => void;
  onRunDemo: () => void;
  isRunning: boolean;
  isBackendReady: boolean;
}

export function CommonControls({
  cycles,
  setCycles,
  difficulty,
  setDifficulty,
  hashAlgorithm,
  setHashAlgorithm,
  seedMode,
  setSeedMode,
  manualSeed,
  setManualSeed,
  onRunDemo,
  isRunning,
  isBackendReady,
}: CommonControlsProps) {
  const [newInputValue, setNewInputValue] = useState('');

  const addManualInput = () => {
    if (newInputValue.trim()) {
      setManualSeed([...manualSeed, newInputValue.trim()]);
      setNewInputValue('');
      setCycles(manualSeed.length + 1);
    }
  };

  const removeManualInput = (index: number) => {
    const updated = manualSeed.filter((_, i) => i !== index);
    setManualSeed(updated);
    setCycles(updated.length);
  };

  const handleModeChange = (mode: 'auto' | 'manual') => {
    setSeedMode(mode);
    if (mode === 'manual' && manualSeed.length === 0) {
      // Initialize with empty array
      setManualSeed([]);
    }
  };

  const runDisabled =
    isRunning || !isBackendReady || (seedMode === 'manual' && manualSeed.length === 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Common Controls
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Number of Input Values */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Number of Input Values
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={cycles}
              onChange={(e) => setCycles(parseInt(e.target.value) || 1)}
              disabled={isRunning || seedMode === 'manual'}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {seedMode === 'manual' && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {manualSeed.length} input{manualSeed.length !== 1 ? 's' : ''} added
              </p>
            )}
          </div>

          {/* Hash Algorithm */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hash Algorithm
            </label>
            <select
              value={hashAlgorithm}
              onChange={(e) => setHashAlgorithm(e.target.value as HashAlgorithm)}
              disabled={isRunning}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {HASH_ALGORITHMS.map((algorithm) => (
                <option key={algorithm.value} value={algorithm.value}>
                  {algorithm.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {/* Cycles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cycles: {difficulty}
            </label>
            <input
              type="range"
              min="1"
              max="15"
              value={difficulty}
              onChange={(e) => setDifficulty(parseInt(e.target.value))}
              disabled={isRunning}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>1</span>
              <span>15</span>
            </div>
          </div>

          {/* Seed Input Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Seed Input Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => handleModeChange('auto')}
                disabled={isRunning}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  seedMode === 'auto'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => handleModeChange('manual')}
                disabled={isRunning}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  seedMode === 'manual'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Manual
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={onRunDemo}
          disabled={runDisabled}
          title={isBackendReady ? 'Run demo' : 'Backend disconnected'}
          className="w-full px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4" />
          <span className="hidden sm:inline">Run Demo</span>
          <span className="sm:hidden">Run</span>
        </button>
      </div>

      {/* Manual Input Section */}
      {seedMode === 'manual' && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Add Input Values
          </h3>
          
          {/* Input field to add new values */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newInputValue}
              onChange={(e) => setNewInputValue(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addManualInput();
                }
              }}
              placeholder="Enter seed value..."
              disabled={isRunning}
              className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={addManualInput}
              disabled={isRunning || !newInputValue.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>

          {/* List of added inputs */}
          {manualSeed.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {manualSeed.map((input, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      #{index + 1}
                    </span>
                    <span className="text-sm text-gray-900 dark:text-white font-mono">
                      {input}
                    </span>
                  </div>
                  <button
                    onClick={() => removeManualInput(index)}
                    disabled={isRunning}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600 dark:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove input"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
              No input values added yet. Add at least one to run the demo.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
