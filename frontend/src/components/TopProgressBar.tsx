import React, { useEffect, useState } from 'react';

interface TopProgressBarProps {
  loading: boolean;
}

export const TopProgressBar: React.FC<TopProgressBarProps> = ({ loading }) => {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    let timer1: any;
    let timer2: any;
    let slowTimer: any;

    if (loading) {
      setVisible(true);
      setProgress(20);
      setIsSlow(false);

      // Advance progress smoothly
      timer1 = setTimeout(() => {
        setProgress(65);
      }, 150);

      timer2 = setTimeout(() => {
        setProgress(85);
      }, 400);

      // If still loading after 800ms, mark as slow network
      slowTimer = setTimeout(() => {
        setIsSlow(true);
        setProgress(92);
      }, 800);
    } else {
      setProgress(100);
      const hideTimer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
        setIsSlow(false);
      }, 300);

      return () => clearTimeout(hideTimer);
    }

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(slowTimer);
    };
  }, [loading]);

  if (!visible) return null;

  return (
    <>
      {/* Top Thin Glowing Progress Line */}
      <div className="fixed top-0 left-0 right-0 h-[2.5px] z-[9999] pointer-events-none overflow-hidden bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-primary via-indigo-400 to-tertiary transition-all duration-300 ease-out shadow-[0_0_8px_rgba(74,64,193,0.6)]"
          style={{
            width: `${progress}%`,
            transitionProperty: 'width, opacity',
          }}
        />
      </div>

      {/* Floating Slow-Network Notification Pill (Only appears when request is slow > 800ms) */}
      {isSlow && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full bg-surface-container-high/95 text-on-surface text-xs font-medium shadow-md border border-outline-variant/30 flex items-center gap-2 animate-toast pointer-events-none">
          <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Syncing with server...</span>
        </div>
      )}
    </>
  );
};
