import React, { useState, useRef, ReactNode } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  disabled = false,
}) => {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const THRESHOLD = 64;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || refreshing) return;
    if (window.scrollY <= 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || disabled || refreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (diff > 0 && window.scrollY <= 0) {
      const damped = Math.min(diff * 0.42, 85);
      setPullY(damped);
    } else {
      setPullY(0);
      isPullingRef.current = false;
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current || disabled) return;
    isPullingRef.current = false;

    if (pullY >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullY(THRESHOLD);
      try {
        await Promise.resolve(onRefresh());
        setJustUpdated(true);
      } catch (err) {
        console.error('Pull-to-refresh error:', err);
      } finally {
        setTimeout(() => {
          setRefreshing(false);
          setJustUpdated(false);
          setPullY(0);
        }, 600);
      }
    } else {
      setPullY(0);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative w-full"
    >
      {/* Pull indicator */}
      <div
        className="w-full flex items-center justify-center pointer-events-none transition-all duration-200 overflow-hidden"
        style={{
          height: `${pullY}px`,
          opacity: pullY > 10 ? 1 : 0,
        }}
      >
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-high/95 text-on-surface shadow-md border border-outline-variant/30 text-xs font-medium">
          {justUpdated ? (
            <>
              <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
              <span className="text-tertiary font-semibold">Updated!</span>
            </>
          ) : refreshing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Refreshing...</span>
            </>
          ) : (
            <>
              <span
                className="material-symbols-outlined text-[16px] transition-transform duration-200"
                style={{
                  transform: pullY >= THRESHOLD ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              >
                arrow_downward
              </span>
              <span>{pullY >= THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}</span>
            </>
          )}
        </div>
      </div>

      {children}
    </div>
  );
};
