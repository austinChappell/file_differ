'use client';

import { useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export default function Home() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [csv1Data, setCsv1Data] = useState<string[][]>([]);
  const [csv2Data, setCsv2Data] = useState<string[][]>([]);
  const [diff, setDiff] = useState<DiffResult[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [hasCompared, setHasCompared] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  type DiffResult = {
    row: number;
    type: 'added' | 'removed' | 'modified' | 'unchanged';
    data1?: string[];
    data2?: string[];
    changes?: { col: number; old: string; new: string }[];
  };

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line => {
      const cells: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cells.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      cells.push(current.trim());
      return cells;
    });
  };

  const handleFileChange = async (file: File, fileNumber: 1 | 2) => {
    if (fileNumber === 1) {
      setFile1(file);
    } else {
      setFile2(file);
    }

    const text = await file.text();
    const data = parseCSV(text);

    if (fileNumber === 1) {
      setCsv1Data(data);
    } else {
      setCsv2Data(data);
    }
  };

  const virtualizer = useVirtualizer({
    count: diff.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 45,
    overscan: 10,
  });

  const compareCSVs = async () => {
    setIsComparing(true);
    setHasCompared(false);

    // Use setTimeout to allow UI to update with loading state
    setTimeout(() => {
      const results: DiffResult[] = [];
      const maxRows = Math.max(csv1Data.length, csv2Data.length);

      for (let i = 0; i < maxRows; i++) {
        const row1 = csv1Data[i];
        const row2 = csv2Data[i];

        if (!row1 && row2) {
          results.push({ row: i, type: 'added', data2: row2 });
        } else if (row1 && !row2) {
          results.push({ row: i, type: 'removed', data1: row1 });
        } else if (row1 && row2) {
          const maxCols = Math.max(row1.length, row2.length);
          let isModified = false;
          const changes: { col: number; old: string; new: string }[] = [];

          for (let j = 0; j < maxCols; j++) {
            if (row1[j] !== row2[j]) {
              isModified = true;
              changes.push({ col: j, old: row1[j] || '', new: row2[j] || '' });
            }
          }

          if (isModified) {
            results.push({
              row: i,
              type: 'modified',
              data1: row1,
              data2: row2,
              changes,
            });
          }
        }
      }

      setDiff(results);
      setHasCompared(true);
      setIsComparing(false);
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black">
      <div className="h-screen flex flex-col">
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
          <div className="px-6 py-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 flex-1">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0], 1)}
                    className="hidden"
                    id="file1"
                  />
                  <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors">
                    Choose File 1
                  </div>
                </label>
                {file1 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">{file1.name}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 flex-1">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0], 2)}
                    className="hidden"
                    id="file2"
                  />
                  <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors">
                    Choose File 2
                  </div>
                </label>
                {file2 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium text-green-900 dark:text-green-100">{file2.name}</span>
                  </div>
                )}
              </div>

              {(
                <button
                  onClick={compareCSVs}
                  disabled={isComparing || !(file1 || file2)}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
                >
                  {isComparing ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Comparing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      Compare
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden px-6 py-4">

          {hasCompared && diff.length === 0 && (
            <div className="h-full flex items-center justify-center">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-300 dark:border-green-800 rounded-2xl p-12 text-center shadow-xl">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-green-700 dark:text-green-300 text-2xl font-bold mb-2">Files Match</div>
                <p className="text-green-600 dark:text-green-400 text-lg">No differences found between the two CSV files.</p>
              </div>
            </div>
          )}

          {diff.length > 0 && (
            <div className="h-full bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <div className="bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 px-6 py-3 border-b border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
                    {diff.length.toLocaleString()} {diff.length === 1 ? 'Difference' : 'Differences'}
                  </h2>
                </div>
              </div>
              <div
                ref={parentRef}
                className="overflow-auto font-mono text-sm"
                style={{ height: 'calc(100vh - 160px)' }}
              >
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualItem) => {
                  const result = diff[virtualItem.index];
                  return (
                    <div
                      key={virtualItem.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                      className="border-b border-zinc-200 dark:border-zinc-800"
                    >
                      {result.type === 'removed' && result.data1 && (
                        <div className="grid grid-cols-2 h-full">
                          <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-600">
                            <div className="flex">
                              <div className="w-16 flex-shrink-0 text-right pr-4 py-2 text-red-600 dark:text-red-400 select-none">
                                {result.row + 1}
                              </div>
                              <div className="flex-1 py-2 pr-4 text-red-800 dark:text-red-200">
                                <span className="text-red-600 dark:text-red-400 mr-2">-</span>
                                {result.data1.join(', ')}
                              </div>
                            </div>
                          </div>
                          <div className="bg-zinc-50 dark:bg-zinc-950/30"></div>
                        </div>
                      )}
                      {result.type === 'added' && result.data2 && (
                        <div className="grid grid-cols-2 h-full">
                          <div className="bg-zinc-50 dark:bg-zinc-950/30"></div>
                          <div className="bg-green-50 dark:bg-green-950/30 border-l-4 border-green-600">
                            <div className="flex">
                              <div className="w-16 flex-shrink-0 text-right pr-4 py-2 text-green-600 dark:text-green-400 select-none">
                                {result.row + 1}
                              </div>
                              <div className="flex-1 py-2 pr-4 text-green-800 dark:text-green-200">
                                <span className="text-green-600 dark:text-green-400 mr-2">+</span>
                                {result.data2.join(', ')}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {result.type === 'modified' && result.data1 && result.data2 && (
                        <div className="grid grid-cols-2 h-full">
                          <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-600">
                            <div className="flex">
                              <div className="w-16 flex-shrink-0 text-right pr-4 py-2 text-red-600 dark:text-red-400 select-none">
                                {result.row + 1}
                              </div>
                              <div className="flex-1 py-2 pr-4 text-red-800 dark:text-red-200">
                                <span className="text-red-600 dark:text-red-400 mr-2">-</span>
                                {result.data1.map((cell, cellIdx) => {
                                  const isChanged = result.changes?.some(c => c.col === cellIdx);
                                  return (
                                    <span key={cellIdx}>
                                      {isChanged ? (
                                        <span className="bg-red-200 dark:bg-red-900/50">{cell}</span>
                                      ) : (
                                        cell
                                      )}
                                      {cellIdx < result.data1!.length - 1 && ', '}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="bg-green-50 dark:bg-green-950/30 border-l-4 border-green-600">
                            <div className="flex">
                              <div className="w-16 flex-shrink-0 text-right pr-4 py-2 text-green-600 dark:text-green-400 select-none">
                                {result.row + 1}
                              </div>
                              <div className="flex-1 py-2 pr-4 text-green-800 dark:text-green-200">
                                <span className="text-green-600 dark:text-green-400 mr-2">+</span>
                                {result.data2.map((cell, cellIdx) => {
                                  const isChanged = result.changes?.some(c => c.col === cellIdx);
                                  return (
                                    <span key={cellIdx}>
                                      {isChanged ? (
                                        <span className="bg-green-200 dark:bg-green-900/50">{cell}</span>
                                      ) : (
                                        cell
                                      )}
                                      {cellIdx < result.data2!.length - 1 && ', '}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
