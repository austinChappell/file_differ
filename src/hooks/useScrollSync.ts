import { useEffect, RefObject } from 'react';

export function useScrollSync(
  leftPanelRef: RefObject<HTMLDivElement | null>,
  rightPanelRef: RefObject<HTMLDivElement | null>,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) return;

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
  }, [leftPanelRef, rightPanelRef, enabled]);
}
