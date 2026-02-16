'use client';

import { useState, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import * as Diff from 'diff';

// Helper function to highlight character-level differences
const highlightDifferences = (oldText: string, newText: string) => {
  const changes = Diff.diffChars(oldText, newText);
  const oldParts: Array<{ text: string; changed: boolean }> = [];
  const newParts: Array<{ text: string; changed: boolean }> = [];

  for (const change of changes) {
    if (change.added) {
      newParts.push({ text: change.value, changed: true });
    } else if (change.removed) {
      oldParts.push({ text: change.value, changed: true });
    } else {
      oldParts.push({ text: change.value, changed: false });
      newParts.push({ text: change.value, changed: false });
    }
  }

  return { oldParts, newParts };
};

// Calculate similarity between two strings (0-1, higher is more similar)
const calculateSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  // Use case-insensitive comparison for better matching
  const longerLower = longer.toLowerCase();
  const shorterLower = shorter.toLowerCase();

  // Simple edit distance approximation
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longerLower.includes(shorterLower[i])) matches++;
  }

  return matches / longer.length;
};

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
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  type DiffResult = {
    type: 'added' | 'removed' | 'modified';
    oldLines?: string[];
    newLines?: string[];
    oldStart?: number;
    newStart?: number;
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

  // Calculate total lines for virtualizer
  const totalLines = diff.reduce((acc, item) => {
    if (item.type === 'modified') {
      return acc + Math.max(item.oldLines?.length || 0, item.newLines?.length || 0);
    }
    return acc + (item.oldLines?.length || 0) + (item.newLines?.length || 0);
  }, 0);


  const virtualizer = useVirtualizer({
    count: totalLines,
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

      // Convert data to line strings
      const lines1 = csv1Data.map(row => row.join(', '));
      const lines2 = csv2Data.map(row => row.join(', '));

      const text1 = lines1.join('\n');
      const text2 = lines2.join('\n');

      // Use diff library to get smart diff
      const patches = Diff.structuredPatch('file1', 'file2', text1, text2, '', '');

      // Process hunks
      for (const hunk of patches.hunks) {
        const addedLines: string[] = [];
        const removedLines: string[] = [];
        let oldLineNum = hunk.oldStart;
        let newLineNum = hunk.newStart;

        for (const line of hunk.lines) {
          if (line.startsWith('+')) {
            addedLines.push(line.substring(1));
          } else if (line.startsWith('-')) {
            removedLines.push(line.substring(1));
          }
        }

        // If we have both additions and removals, try to pair them intelligently based on similarity
        if (removedLines.length > 0 && addedLines.length > 0) {
          const usedAdded = new Set<number>();
          const usedRemoved = new Set<number>();
          const SIMILARITY_THRESHOLD = 0.4; // Minimum similarity to consider a match

          // First pass: find best matches for removed lines
          const matches: Array<{ removeIdx: number; addIdx: number; similarity: number }> = [];

          for (let removeIdx = 0; removeIdx < removedLines.length; removeIdx++) {
            let bestMatch = -1;
            let bestSimilarity = SIMILARITY_THRESHOLD;

            for (let addIdx = 0; addIdx < addedLines.length; addIdx++) {
              const similarity = calculateSimilarity(removedLines[removeIdx], addedLines[addIdx]);
              if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestMatch = addIdx;
              }
            }

            if (bestMatch !== -1) {
              matches.push({ removeIdx, addIdx: bestMatch, similarity: bestSimilarity });
            }
          }

          // Sort matches by similarity (best matches first) and apply them
          matches.sort((a, b) => b.similarity - a.similarity);

          // Mark which lines are matched
          const matchedPairs: Array<{ removeIdx: number; addIdx: number }> = [];
          for (const match of matches) {
            if (!usedRemoved.has(match.removeIdx) && !usedAdded.has(match.addIdx)) {
              matchedPairs.push({ removeIdx: match.removeIdx, addIdx: match.addIdx });
              usedRemoved.add(match.removeIdx);
              usedAdded.add(match.addIdx);
            }
          }

          // Build results in order (interleaving additions and modifications/removals)
          const hunkResults: Array<{ result: DiffResult; oldPos: number; newPos: number }> = [];

          // Add all matched pairs
          for (const pair of matchedPairs) {
            hunkResults.push({
              result: {
                type: 'modified',
                oldLines: [removedLines[pair.removeIdx]],
                newLines: [addedLines[pair.addIdx]],
                oldStart: oldLineNum + pair.removeIdx,
                newStart: newLineNum + pair.addIdx,
              },
              oldPos: pair.removeIdx,
              newPos: pair.addIdx,
            });
          }

          // Add unmatched removals
          for (let i = 0; i < removedLines.length; i++) {
            if (!usedRemoved.has(i)) {
              hunkResults.push({
                result: {
                  type: 'removed',
                  oldLines: [removedLines[i]],
                  oldStart: oldLineNum + i,
                },
                oldPos: i,
                newPos: -1,
              });
            }
          }

          // Add unmatched additions
          for (let i = 0; i < addedLines.length; i++) {
            if (!usedAdded.has(i)) {
              hunkResults.push({
                result: {
                  type: 'added',
                  newLines: [addedLines[i]],
                  newStart: newLineNum + i,
                },
                oldPos: -1,
                newPos: i,
              });
            }
          }

          // Sort by position (additions first by new position, then removals/modifications by old position)
          hunkResults.sort((a, b) => {
            // Compare by the minimum position (old or new) to maintain order
            const aPos = a.newPos !== -1 ? a.newPos : a.oldPos;
            const bPos = b.newPos !== -1 ? b.newPos : b.oldPos;
            return aPos - bPos;
          });

          // Add sorted results
          for (const item of hunkResults) {
            results.push(item.result);
          }
        } else if (removedLines.length > 0) {
          results.push({
            type: 'removed',
            oldLines: removedLines,
            oldStart: hunk.oldStart,
          });
        } else if (addedLines.length > 0) {
          results.push({
            type: 'added',
            newLines: addedLines,
            newStart: hunk.newStart,
          });
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

  // Sync vertical scroll between left and right panels
  useEffect(() => {
    const leftPanel = leftPanelRef.current;
    const rightPanel = rightPanelRef.current;

    if (!leftPanel || !rightPanel) return;

    const syncScroll = (source: HTMLDivElement, target: HTMLDivElement) => {
      return () => {
        target.scrollTop = source.scrollTop;
      };
    };

    const leftScrollHandler = syncScroll(leftPanel, rightPanel);
    const rightScrollHandler = syncScroll(rightPanel, leftPanel);

    leftPanel.addEventListener('scroll', leftScrollHandler);
    rightPanel.addEventListener('scroll', rightScrollHandler);

    return () => {
      leftPanel.removeEventListener('scroll', leftScrollHandler);
      rightPanel.removeEventListener('scroll', rightScrollHandler);
    };
  }, [diff]);

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
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black">
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
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-300 dark:border-green-800 rounded-2xl p-12 text-center shadow-xl">
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
              <div className="bg-gradient-to-r from-zinc-100 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900 px-6 py-3 border-b border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">
                    {diff.length.toLocaleString()} {diff.length === 1 ? 'Change' : 'Changes'}
                  </h2>
                </div>
              </div>
              <div className="grid grid-cols-2 h-full" style={{ height: 'calc(100vh - 160px)' }}>
                {/* Left Panel */}
                <div ref={leftPanelRef} className="overflow-auto font-mono text-sm border-r border-zinc-200 dark:border-zinc-800">
                  <div
                    ref={parentRef}
                    style={{
                      height: `${virtualizer.getTotalSize()}px`,
                      width: 'fit-content',
                      minWidth: '100%',
                      position: 'relative',
                    }}
                  >
                    {virtualizer.getVirtualItems().map((virtualItem) => {
                    // Map virtual item index to diff chunk and line
                    let lineCount = 0;
                    let currentChunk: DiffResult | null = null;
                    let lineIndex = 0;

                    for (const chunk of diff) {
                      const chunkSize = chunk.type === 'modified'
                        ? Math.max(chunk.oldLines?.length || 0, chunk.newLines?.length || 0)
                        : (chunk.oldLines?.length || 0) + (chunk.newLines?.length || 0);

                      if (virtualItem.index < lineCount + chunkSize) {
                        currentChunk = chunk;
                        lineIndex = virtualItem.index - lineCount;
                        break;
                      }
                      lineCount += chunkSize;
                    }

                    if (!currentChunk) return null;

                    return (
                      <div
                        key={virtualItem.key}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          minWidth: 'max-content',
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                        className="border-b border-zinc-200 dark:border-zinc-800"
                      >
                        {/* Left side (removed/old lines) */}
                        {(currentChunk.type === 'removed' || currentChunk.type === 'modified') && currentChunk.oldLines && lineIndex < currentChunk.oldLines.length ? (
                          <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-600 h-full flex w-full">
                            <div className="w-16 flex-shrink-0 text-right pr-4 py-2 text-red-600 dark:text-red-400 select-none">
                              {(currentChunk.oldStart || 0) + lineIndex}
                            </div>
                            <div className="py-2 pr-4 text-red-800 dark:text-red-200 whitespace-nowrap">
                              <span className="text-red-600 dark:text-red-400 mr-2">-</span>
                              {currentChunk.type === 'modified' && currentChunk.newLines && lineIndex < currentChunk.newLines.length ? (
                                (() => {
                                  const { oldParts } = highlightDifferences(currentChunk.oldLines[lineIndex], currentChunk.newLines[lineIndex]);
                                  return oldParts.map((part, i) => (
                                    <span key={i} className={part.changed ? 'bg-red-300 dark:bg-red-800' : ''}>
                                      {part.text}
                                    </span>
                                  ));
                                })()
                              ) : (
                                currentChunk.oldLines[lineIndex]
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-zinc-50 dark:bg-zinc-950/30 h-full w-full"></div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                </div>

                {/* Right Panel */}
                <div ref={rightPanelRef} className="overflow-auto font-mono text-sm">
                  <div
                    style={{
                      height: `${virtualizer.getTotalSize()}px`,
                      width: 'fit-content',
                      minWidth: '100%',
                      position: 'relative',
                    }}
                  >
                    {virtualizer.getVirtualItems().map((virtualItem) => {
                    // Map virtual item index to diff chunk and line
                    let lineCount = 0;
                    let currentChunk: DiffResult | null = null;
                    let lineIndex = 0;

                    for (const chunk of diff) {
                      const chunkSize = chunk.type === 'modified'
                        ? Math.max(chunk.oldLines?.length || 0, chunk.newLines?.length || 0)
                        : (chunk.oldLines?.length || 0) + (chunk.newLines?.length || 0);

                      if (virtualItem.index < lineCount + chunkSize) {
                        currentChunk = chunk;
                        lineIndex = virtualItem.index - lineCount;
                        break;
                      }
                      lineCount += chunkSize;
                    }

                    if (!currentChunk) return null;

                    return (
                      <div
                        key={virtualItem.key}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          minWidth: 'max-content',
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                        className="border-b border-zinc-200 dark:border-zinc-800"
                      >
                        {/* Right side (added/new lines) */}
                        {(currentChunk.type === 'added' || currentChunk.type === 'modified') && currentChunk.newLines && lineIndex < currentChunk.newLines.length ? (
                          <div className="bg-green-50 dark:bg-green-950/30 border-l-4 border-green-600 h-full flex w-full">
                            <div className="w-16 flex-shrink-0 text-right pr-4 py-2 text-green-600 dark:text-green-400 select-none">
                              {(currentChunk.newStart || 0) + lineIndex}
                            </div>
                            <div className="py-2 pr-4 text-green-800 dark:text-green-200 whitespace-nowrap">
                              <span className="text-green-600 dark:text-green-400 mr-2">+</span>
                              {currentChunk.type === 'modified' && currentChunk.oldLines && lineIndex < currentChunk.oldLines.length ? (
                                (() => {
                                  const { newParts } = highlightDifferences(currentChunk.oldLines[lineIndex], currentChunk.newLines[lineIndex]);
                                  return newParts.map((part, i) => (
                                    <span key={i} className={part.changed ? 'bg-green-300 dark:bg-green-800' : ''}>
                                      {part.text}
                                    </span>
                                  ));
                                })()
                              ) : (
                                currentChunk.newLines[lineIndex]
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="bg-zinc-50 dark:bg-zinc-950/30 h-full w-full"></div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
