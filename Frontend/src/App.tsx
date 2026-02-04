import React, { useEffect, useState } from 'react';
import { CommonControls } from './components/CommonControls';
import { SyncPanel } from './components/SyncPanel';
import { AsyncPanel } from './components/AsyncPanel';
import { SyncTable } from './components/SyncTable';
import { AckTable } from './components/AckTable';
import { CallbackTable } from './components/CallbackTable';
import { InputValuesCard } from './components/InputValuesCard';
import { Moon, Sun, AlertTriangle } from 'lucide-react';
import { API_BASE, getAsyncStatus, getHealth, runAsync, runSync } from './lib/api';
import type { AsyncStatusResult } from './lib/api';
import { DEFAULT_HASH_ALGORITHM, HashAlgorithm } from './lib/hashConfig';

type SyncRow = {
  cycle: number;
  seed: string;
  status: string;
  latency: number | null;
  hash: string | null;
  processingTimeMs: number | null;
  wallTimeMs: number | null;
  queueTimeMs: number | null;
  totalTimeMs: number | null;
  enqueuedAtMs: number | null;
  startedAtMs: number | null;
  completedAtMs: number | null;
};

type AckRow = {
  cycle: number;
  seed: string;
  requestId: string;
  ackTime: string;
};

type CallbackRow = {
  cycle: number;
  requestId: string;
  status: string;
  attempts: number;
  callbackTime: number | null;
  hash: string | null;
  enqueuedAtMs: number | null;
  startedAtMs: number | null;
  completedAtMs: number | null;
};

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [inputCount, setInputCount] = useState(5);
  const [difficulty, setDifficulty] = useState(3);
  const [hashAlgorithm, setHashAlgorithm] = useState<HashAlgorithm>(DEFAULT_HASH_ALGORITHM);
  const [seedMode, setSeedMode] = useState<'auto' | 'manual'>('auto');
  const [manualInputs, setManualInputs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastSeeds, setLastSeeds] = useState<string[]>([]);
  const [lastDifficulty, setLastDifficulty] = useState(3);
  const [lastAlgorithm, setLastAlgorithm] = useState<HashAlgorithm>(DEFAULT_HASH_ALGORITHM);

  const [syncData, setSyncData] = useState<SyncRow[]>([]);
  const [asyncAckData, setAsyncAckData] = useState<AckRow[]>([]);
  const [asyncCallbackData, setAsyncCallbackData] = useState<CallbackRow[]>([]);

  const [pendingRequestIds, setPendingRequestIds] = useState<string[]>([]);
  const [syncComplete, setSyncComplete] = useState(false);
  const [asyncComplete, setAsyncComplete] = useState(false);
  const [asyncStarted, setAsyncStarted] = useState(false);
  const [syncRunStartedAt, setSyncRunStartedAt] = useState<number | null>(null);
  const [syncRunCompletedAt, setSyncRunCompletedAt] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [backendLatency, setBackendLatency] = useState<number | null>(null);
  const asyncWorkerConcurrency = 5;
  const asyncBrokerLabel = 'Redis';

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const checkBackend = async () => {
    const start = performance.now();
    try {
      await getHealth();
      setBackendStatus('online');
      setBackendLatency(Math.round(performance.now() - start));
      return true;
    } catch {
      setBackendStatus('offline');
      setBackendLatency(null);
      return false;
    }
  };

  const runDemo = async () => {
    const seeds =
      seedMode === 'manual'
        ? manualInputs.map(seed => seed.trim()).filter(Boolean)
        : Array.from({ length: inputCount }, (_, index) => {
            const timestamp = Date.now();
            return `seed-${timestamp}-${index}-${Math.random().toString(36).substring(7)}`;
          });

    if (seeds.length === 0) {
      return;
    }

    setErrorMessage(null);
    const backendOk = await checkBackend();
    if (!backendOk) {
      setErrorMessage(`Backend unavailable at ${API_BASE}. Start the Django server and try again.`);
      return;
    }

    setIsRunning(true);
    setSyncComplete(false);
    setAsyncComplete(false);
    setAsyncStarted(false);
    setPendingRequestIds([]);
    setSyncRunStartedAt(null);
    setSyncRunCompletedAt(null);

    setLastSeeds(seeds);
    setLastDifficulty(difficulty);
    setLastAlgorithm(hashAlgorithm);
    setSyncData(
      seeds.map((seed, index) => ({
        cycle: index + 1,
        seed,
        status: 'running',
        latency: null,
        hash: null,
        processingTimeMs: null,
        wallTimeMs: null,
        queueTimeMs: null,
        totalTimeMs: null,
        enqueuedAtMs: null,
        startedAtMs: null,
        completedAtMs: null,
      }))
    );
    setAsyncAckData([]);
    setAsyncCallbackData([]);

    void runAsyncDemo(seeds);
    void runSyncDemo(seeds);
  };

  const handleRunDemo = () => {
    void runDemo();
  };

  const runSyncDemo = async (seedList: string[]) => {
    try {
      setSyncRunStartedAt(performance.now());
  
      // Send all seeds in a single request to eliminate HTTP overhead
      const response = await runSync(seedList, difficulty, hashAlgorithm);
      const results = response.results || [];

      // Simulate progressive updates by showing results one by one
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        
        // Update UI with current result
        setSyncData(prev =>
          prev.map(item => {
            if (item.cycle === result.cycle) {
              return {
                ...item,
                status: result.status,
                latency: result.latencyMs ?? null,
                hash: result.hash ?? null,
                processingTimeMs: result.processingTimeMs ?? null,
                wallTimeMs: result.wallTimeMs ?? null,
                queueTimeMs: result.queueTimeMs ?? null,
                totalTimeMs: result.totalTimeMs ?? null,
                enqueuedAtMs: result.enqueuedAtMs ?? null,
                startedAtMs: result.startedAtMs ?? null,
                completedAtMs: result.completedAtMs ?? null,
              };
            }
            return item;
          })
        );
        
        // Add a small delay to simulate progressive completion
        // Only delay if this isn't the last result
        if (i < results.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    } catch {
      setErrorMessage('Sync request failed.');
      setSyncData(prev =>
        prev.map(item => ({
          ...item,
          status: 'failed',
          processingTimeMs: null,
          wallTimeMs: null,
          queueTimeMs: null,
          totalTimeMs: null,
          enqueuedAtMs: null,
          startedAtMs: null,
          completedAtMs: null,
        }))
      );
    } finally {
      setSyncRunCompletedAt(performance.now());
      setSyncComplete(true);
    }
  };
  
  

  const runAsyncDemo = async (seedList: string[]) => {
    try {
      const response = await runAsync(seedList, difficulty, hashAlgorithm);
      const ackRows = response.acks.map(ack => ({
        cycle: ack.cycle,
        seed: ack.seed,
        requestId: ack.requestId,
        ackTime: ack.ackTimeMs.toFixed(2),
      }));
      setAsyncAckData(ackRows);

      setAsyncCallbackData(
        ackRows.map(ack => ({
          cycle: ack.cycle,
          requestId: ack.requestId,
          status: 'queued',
          attempts: 1,
          callbackTime: null,
          hash: null,
        enqueuedAtMs: null,
          startedAtMs: null,
        completedAtMs: null,
        }))
      );

      const pendingIds = ackRows.map(ack => ack.requestId).filter(Boolean);
      setPendingRequestIds(pendingIds);
      setAsyncComplete(false);
      setAsyncStarted(true);
    } catch (err) {
      console.error('Async request failed:', err);
      setErrorMessage('Async request failed. Ensure the backend is running.');
      setBackendStatus('offline');
      setBackendLatency(null);
      setAsyncComplete(true);
    }
  };

  useEffect(() => {
    void checkBackend();
    const interval = setInterval(() => {
      void checkBackend();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Poll for Celery results while requests are pending.
    if (!asyncStarted || pendingRequestIds.length === 0) {
      return;
    }

    let isActive = true;
    const interval = setInterval(async () => {
      if (pendingRequestIds.length === 0) {
        return;
      }
      
      try {
        const response = await getAsyncStatus(pendingRequestIds);
        const results = response.results as AsyncStatusResult[];
        if (!isActive) {
          return;
        }

        setAsyncCallbackData(prev => {
          const mapped = new Map<string, CallbackRow>();
          prev.forEach(item => {
            mapped.set(item.requestId, item);
          });
          results.forEach(result => {
            const existing = mapped.get(result.requestId);
            if (!existing) {
              return;
            }
            mapped.set(result.requestId, {
              ...existing,
              status: result.status ?? existing.status,
              attempts: result.attempts ?? existing.attempts,
              callbackTime: result.callbackTimeMs ?? existing.callbackTime,
              hash: result.hash ?? existing.hash,
              enqueuedAtMs: result.enqueuedAtMs ?? existing.enqueuedAtMs,
              startedAtMs: result.startedAtMs ?? existing.startedAtMs,
              completedAtMs: result.completedAtMs ?? existing.completedAtMs,
            });
          });
          return Array.from(mapped.values()).sort((a, b) => a.cycle - b.cycle);
        });

        const completed = results
          .filter(result => result.status === 'done' || result.status === 'failed')
          .map(result => result.requestId);

        if (completed.length > 0) {
          setPendingRequestIds(prev => {
            const remaining = prev.filter(id => !completed.includes(id));
            if (remaining.length === 0) {
              setAsyncComplete(true);
            }
            return remaining;
          });
        }
      } catch {
        if (!isActive) {
          return;
        }
        setBackendStatus('offline');
        setBackendLatency(null);
        setErrorMessage('Failed to poll async status from the backend.');
        setPendingRequestIds([]);
        setAsyncComplete(true);
      }
    }, 800);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [asyncStarted, pendingRequestIds]);

  useEffect(() => {
    if (syncComplete && asyncComplete) {
      setIsRunning(false);
    }
  }, [syncComplete, asyncComplete]);

  const asyncCompletedTimes = asyncCallbackData
    .map(item => item.completedAtMs)
    .filter((value): value is number => value != null);
  const asyncStartedTimes = asyncCallbackData
    .map(item => item.startedAtMs)
    .filter((value): value is number => value != null);
  const asyncTotalRuntimeMs =
    asyncComplete && asyncCompletedTimes.length > 0 && asyncStartedTimes.length > 0
      ? Math.max(...asyncCompletedTimes) - Math.min(...asyncStartedTimes)
      : null;

  const syncTotalRuntimeMs =
    syncRunStartedAt != null && syncRunCompletedAt != null
      ? syncRunCompletedAt - syncRunStartedAt
      : null;

  return (
    <div className={theme}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Proof-of-Work Hashing Demo
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Sync vs async processing powered by Django, Celery, and Redis
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 px-2.5 py-1 rounded-full">
                Django • Celery • Redis
              </span>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle theme"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Sun className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-[1600px] mx-auto px-6 py-8 flex flex-col gap-8">
          <CommonControls
            cycles={inputCount}
            setCycles={setInputCount}
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            hashAlgorithm={hashAlgorithm}
            setHashAlgorithm={setHashAlgorithm}
            seedMode={seedMode}
            setSeedMode={setSeedMode}
            manualSeed={manualInputs}
            setManualSeed={setManualInputs}
            onRunDemo={handleRunDemo}
            isRunning={isRunning}
            isBackendReady={backendStatus === 'online'}
          />

          {errorMessage && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-700 dark:text-red-400 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-400">{errorMessage}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start py-4">
            <SyncTable data={syncData} />
            <AckTable data={asyncAckData} />
            <CallbackTable data={asyncCallbackData} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <SyncPanel data={syncData} totalCycles={inputCount} totalRuntimeMs={syncTotalRuntimeMs} />
            <div className="lg:col-span-2">
              <AsyncPanel
                ackData={asyncAckData}
                callbackData={asyncCallbackData}
                difficulty={lastDifficulty}
                hashAlgorithm={lastAlgorithm}
                workerConcurrency={asyncWorkerConcurrency}
                brokerLabel={asyncBrokerLabel}
                totalRuntimeMs={asyncTotalRuntimeMs}
              />
            </div>
          </div>

          <div className="mt-6">
            <InputValuesCard inputs={lastSeeds} />
          </div>
        </main>
      </div>
    </div>
  );
}