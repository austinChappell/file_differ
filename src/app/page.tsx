'use client';

import { useState, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export default function Home() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [csv1Data, setCsv1Data] = useState<string[][]>([]);
  const [csv2Data, setCsv2Data] = useState<string[][]>([]);
  const [diff, setDiff] = useState<DiffResult[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [hasCompared, setHasCompared] = useState(false);
  const [dragOver1, setDragOver1] = useState(false);
  const [dragOver2, setDragOver2] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  type DiffResult = {
    row: number;
    type: 'added' | 'removed' | 'modified' | 'unchanged';
    data1?: string[];
    data2?: string[];
    changes?: { col: number; old: string; new: string }[];
  };

  const parseFile = (text: string, filename: string): string[][] => {
    const ext = filename.split('.').pop()?.toLowerCase();

    if (ext === 'json') {
      try {
        const json = JSON.parse(text);
        return JSON.stringify(json, null, 2).split('\n').map(line => [line]);
      } catch {
        return text.split('\n').map(line => [line]);
      }
    } else if (ext === 'html' || ext === 'txt' || ext === 'sql') {
      return text.split('\n').map(line => [line]);
    } else {
      // CSV parsing
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
    }
  };

  const handleFileChange = async (file: File, fileNumber: 1 | 2) => {
    if (fileNumber === 1) {
      setFile1(file);
    } else {
      setFile2(file);
    }

    const text = await file.text();
    const data = parseFile(text, file.name);

    if (fileNumber === 1) {
      setCsv1Data(data);
    } else {
      setCsv2Data(data);
    }
  };

  const handleDragOver = (e: React.DragEvent, fileNumber: 1 | 2) => {
    e.preventDefault();
    if (fileNumber === 1) {
      setDragOver1(true);
    } else {
      setDragOver2(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent, fileNumber: 1 | 2) => {
    e.preventDefault();
    if (fileNumber === 1) {
      setDragOver1(false);
    } else {
      setDragOver2(false);
    }
  };

  const handleDrop = (e: React.DragEvent, fileNumber: 1 | 2) => {
    e.preventDefault();
    if (fileNumber === 1) {
      setDragOver1(false);
    } else {
      setDragOver2(false);
    }

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileChange(files[0], fileNumber);
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

  // Auto-compare when both files are loaded
  useEffect(() => {
    if (file1 && file2 && csv1Data.length > 0 && csv2Data.length > 0 && !isComparing && !hasCompared) {
      compareCSVs();
    }
  }, [file1, file2, csv1Data, csv2Data]);

  const handleStartOver = () => {
    setFile1(null);
    setFile2(null);
    setCsv1Data([]);
    setCsv2Data([]);
    setDiff([]);
    setHasCompared(false);
    setIsComparing(false);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black">
      <div className="h-screen flex flex-col">
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm">
          <div className="px-6 py-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-zinc-800 dark:text-zinc-100">File Differ</h1>
            {(file1 || file2 || hasCompared) && (
              <button
                onClick={handleStartOver}
                className="px-4 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-200 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Start Over
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-hidden px-6 py-4">
          {!file1 || !file2 ? (
            <div className="h-full flex items-center justify-center">
              <div className="max-w-4xl w-full">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-zinc-800 dark:text-zinc-100 mb-2">Compare Files</h2>
                  <p className="text-zinc-600 dark:text-zinc-400">Drop two files below to see their differences</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-1">Supports CSV, TXT, JSON, HTML, and SQL files</p>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div
                    onDragOver={(e) => handleDragOver(e, 1)}
                    onDragLeave={(e) => handleDragLeave(e, 1)}
                    onDrop={(e) => handleDrop(e, 1)}
                    className={`relative border-2 border-dashed rounded-2xl p-12 transition-all ${
                      dragOver1
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 scale-105'
                        : file1
                        ? 'border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-950/20'
                        : 'border-zinc-300 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                    }`}
                  >
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept=".csv,.txt,.json,.html,.sql"
                        onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0], 1)}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center gap-4">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                          file1 ? 'bg-blue-500' : 'bg-zinc-200 dark:bg-zinc-700'
                        }`}>
                          {file1 ? (
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-10 h-10 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                            {file1 ? file1.name : 'File 1'}
                          </p>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                            {file1 ? 'Click to change' : 'Click or drop file here'}
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>

                  <div
                    onDragOver={(e) => handleDragOver(e, 2)}
                    onDragLeave={(e) => handleDragLeave(e, 2)}
                    onDrop={(e) => handleDrop(e, 2)}
                    className={`relative border-2 border-dashed rounded-2xl p-12 transition-all ${
                      dragOver2
                        ? 'border-green-500 bg-green-50 dark:bg-green-950/30 scale-105'
                        : file2
                        ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-950/20'
                        : 'border-zinc-300 dark:border-zinc-700 hover:border-green-400 dark:hover:border-green-600 hover:bg-zinc-50 dark:hover:bg-zinc-900/50'
                    }`}
                  >
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept=".csv,.txt,.json,.html,.sql"
                        onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0], 2)}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center gap-4">
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                          file2 ? 'bg-green-500' : 'bg-zinc-200 dark:bg-zinc-700'
                        }`}>
                          {file2 ? (
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-10 h-10 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          )}
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                            {file2 ? file2.name : 'File 2'}
                          </p>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                            {file2 ? 'Click to change' : 'Click or drop file here'}
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {isComparing && (
                  <div className="mt-8 flex items-center justify-center gap-3 text-blue-600 dark:text-blue-400">
                    <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-lg font-semibold">Comparing files...</span>
                  </div>
                )}
              </div>
            </div>
          ) : hasCompared && diff.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="bg-linear-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-300 dark:border-green-800 rounded-2xl p-12 text-center shadow-xl">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-green-700 dark:text-green-300 text-2xl font-bold mb-2">Files Match</div>
                <p className="text-green-600 dark:text-green-400 text-lg">No differences found between the two files.</p>
              </div>
            </div>
          ) : diff.length > 0 ? (
            <div className="h-full bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
              <div className="bg-linear-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 px-6 py-3 border-b border-zinc-200 dark:border-zinc-700">
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
                                <div className="w-16 shrink-0 text-right pr-4 py-2 text-red-600 dark:text-red-400 select-none">
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
                                <div className="w-16 shrink-0 text-right pr-4 py-2 text-green-600 dark:text-green-400 select-none">
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
                                <div className="w-16 shrink-0 text-right pr-4 py-2 text-red-600 dark:text-red-400 select-none">
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
                                <div className="w-16 shrink-0 text-right pr-4 py-2 text-green-600 dark:text-green-400 select-none">
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
          ) : null}
        </div>
      </div>
    </div>
  );
}
