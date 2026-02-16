'use client';

import { useRef } from 'react';
import { useDiff } from '@/hooks/useDiff';
import { useScrollSync } from '@/hooks/useScrollSync';
import { FileUpload } from '@/components/FileUpload';
import { DiffPanel } from '@/components/DiffPanel';

export default function Home() {
  const { file1, file2, diff, isComparing, hasCompared, handleFileChange, handleStartOver } = useDiff();
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const leftParentRef = useRef<HTMLDivElement>(null);
  const rightParentRef = useRef<HTMLDivElement>(null);

  useScrollSync(leftPanelRef, rightPanelRef, diff.length > 0);

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
                  <FileUpload file={file1} fileNumber={1} onFileChange={handleFileChange} />
                  <FileUpload file={file2} fileNumber={2} onFileChange={handleFileChange} />
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
                    {diff.length.toLocaleString()} {diff.length === 1 ? 'Change' : 'Changes'}
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-2 h-full" style={{ height: 'calc(100vh - 160px)' }}>
                <DiffPanel diff={diff} side="left" panelRef={leftPanelRef} parentRef={leftParentRef} />
                <DiffPanel diff={diff} side="right" panelRef={rightPanelRef} parentRef={rightParentRef} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
