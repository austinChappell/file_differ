import { DiffResult, highlightDifferences } from '@/lib/diffUtils';

type DiffLineProps = {
  chunk: DiffResult;
  lineIndex: number;
  side: 'left' | 'right';
};

export function DiffLine({ chunk, lineIndex, side }: DiffLineProps) {
  if (side === 'left') {
    // Left side (removed/old lines)
    if ((chunk.type === 'removed' || chunk.type === 'modified') && chunk.oldLines && lineIndex < chunk.oldLines.length) {
      return (
        <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-600 h-full flex w-full">
          <div className="w-16 flex-shrink-0 text-right pr-4 py-2 text-red-600 dark:text-red-400 select-none">
            {(chunk.oldStart || 0) + lineIndex}
          </div>
          <div className="py-2 pr-4 text-red-800 dark:text-red-200 whitespace-nowrap">
            <span className="text-red-600 dark:text-red-400 mr-2">-</span>
            {chunk.type === 'modified' && chunk.newLines && lineIndex < chunk.newLines.length ? (
              (() => {
                const { oldParts } = highlightDifferences(chunk.oldLines[lineIndex], chunk.newLines[lineIndex]);
                return oldParts.map((part, i) => (
                  <span key={i} className={part.changed ? 'bg-red-300 dark:bg-red-800' : ''}>
                    {part.text}
                  </span>
                ));
              })()
            ) : (
              chunk.oldLines[lineIndex]
            )}
          </div>
        </div>
      );
    } else {
      return <div className="bg-zinc-50 dark:bg-zinc-950/30 h-full w-full"></div>;
    }
  } else {
    // Right side (added/new lines)
    if ((chunk.type === 'added' || chunk.type === 'modified') && chunk.newLines && lineIndex < chunk.newLines.length) {
      return (
        <div className="bg-green-50 dark:bg-green-950/30 border-l-4 border-green-600 h-full flex w-full">
          <div className="w-16 flex-shrink-0 text-right pr-4 py-2 text-green-600 dark:text-green-400 select-none">
            {(chunk.newStart || 0) + lineIndex}
          </div>
          <div className="py-2 pr-4 text-green-800 dark:text-green-200 whitespace-nowrap">
            <span className="text-green-600 dark:text-green-400 mr-2">+</span>
            {chunk.type === 'modified' && chunk.oldLines && lineIndex < chunk.oldLines.length ? (
              (() => {
                const { newParts } = highlightDifferences(chunk.oldLines[lineIndex], chunk.newLines[lineIndex]);
                return newParts.map((part, i) => (
                  <span key={i} className={part.changed ? 'bg-green-300 dark:bg-green-800' : ''}>
                    {part.text}
                  </span>
                ));
              })()
            ) : (
              chunk.newLines[lineIndex]
            )}
          </div>
        </div>
      );
    } else {
      return <div className="bg-zinc-50 dark:bg-zinc-950/30 h-full w-full"></div>;
    }
  }
}
