// 开关
import React from 'react';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}

export default function Switch({ checked, onChange, disabled, label }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition
        ${checked
          ? 'bg-primary dark:bg-primary-dark'
          : 'bg-slate-300 dark:bg-white/15'}
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-90'}
        focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-100 transition
          ${checked ? 'translate-x-5' : 'translate-x-1'}`}
      />
    </button>
  );
}
