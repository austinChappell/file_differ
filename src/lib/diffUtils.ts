import * as Diff from 'diff';

export type DiffResult = {
  type: 'added' | 'removed' | 'modified';
  oldLines?: string[];
  newLines?: string[];
  oldStart?: number;
  newStart?: number;
};

// Helper function to highlight character-level differences
export const highlightDifferences = (oldText: string, newText: string) => {
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
export const calculateSimilarity = (str1: string, str2: string): number => {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const longerLower = longer.toLowerCase();
  const shorterLower = shorter.toLowerCase();

  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longerLower.includes(shorterLower[i])) matches++;
  }

  return matches / longer.length;
};

export const parseFile = (text: string, filename: string): string[][] => {
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

export const computeDiff = (csv1Data: string[][], csv2Data: string[][]): DiffResult[] => {
  const results: DiffResult[] = [];

  const lines1 = csv1Data.map(row => row.join(', '));
  const lines2 = csv2Data.map(row => row.join(', '));

  const text1 = lines1.join('\n');
  const text2 = lines2.join('\n');

  const patches = Diff.structuredPatch('file1', 'file2', text1, text2, '', '');

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

    if (removedLines.length > 0 && addedLines.length > 0) {
      const usedAdded = new Set<number>();
      const usedRemoved = new Set<number>();
      const SIMILARITY_THRESHOLD = 0.4;

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

      matches.sort((a, b) => b.similarity - a.similarity);

      const matchedPairs: Array<{ removeIdx: number; addIdx: number }> = [];
      for (const match of matches) {
        if (!usedRemoved.has(match.removeIdx) && !usedAdded.has(match.addIdx)) {
          matchedPairs.push({ removeIdx: match.removeIdx, addIdx: match.addIdx });
          usedRemoved.add(match.removeIdx);
          usedAdded.add(match.addIdx);
        }
      }

      const hunkResults: Array<{ result: DiffResult; oldPos: number; newPos: number }> = [];

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

      hunkResults.sort((a, b) => {
        const aPos = a.newPos !== -1 ? a.newPos : a.oldPos;
        const bPos = b.newPos !== -1 ? b.newPos : b.oldPos;
        return aPos - bPos;
      });

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

  return results;
};
