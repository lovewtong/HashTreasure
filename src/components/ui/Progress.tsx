// 进度条
import React from 'react';

export default function Progress({ value = 0, showLabel = true }: { value?: number; showLabel?: boolean }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-1 text-xs text-slate-600 dark:text-slate-300">{v}%</div>
      )}
      <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary dark:bg-primary-dark transition-[width]"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}
