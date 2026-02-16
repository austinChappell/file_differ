import { RefObject } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { DiffResult } from '@/lib/diffUtils';
import { DiffLine } from './DiffLine';

type DiffPanelProps = {
  diff: DiffResult[];
  side: 'left' | 'right';
  panelRef: RefObject<HTMLDivElement | null>;
  parentRef: RefObject<HTMLDivElement | null>;
};

export function DiffPanel({ diff, side, panelRef, parentRef }: DiffPanelProps) {
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

  return (
    <div ref={panelRef} className={`overflow-auto font-mono text-sm ${side === 'left' ? 'border-r border-zinc-200 dark:border-zinc-800' : ''}`}>
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
              <DiffLine chunk={currentChunk} lineIndex={lineIndex} side={side} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
