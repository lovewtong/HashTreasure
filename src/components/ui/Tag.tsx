// tag标签
import React from 'react';

type Variant = 'primary' | 'neutral' | 'success' | 'warning' | 'danger';

const cls: Record<Variant, string> = {
  primary:
    'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-500/30',
  neutral:
    'bg-slate-100 text-slate-800 border-slate-200 dark:bg-white/10 dark:text-slate-200 dark:border-white/10',
  success:
    'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/30',
  warning:
    'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30',
  danger:
    'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-500/30',
};

export default function Tag({
  children, variant = 'neutral', className = ''
}: React.PropsWithChildren<{ variant?: Variant; className?: string }>) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold border ${cls[variant]} ${className}`} >
      {children}
    </span>
  );
}
