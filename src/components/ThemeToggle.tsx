// src/components/ThemeToggle.tsx
import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const dark = saved ? saved === 'dark' : prefers;
    document.documentElement.classList.toggle('dark', dark);
    setIsDark(dark);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggle}
      aria-label="切换主题"
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 border text-sm
                  border-slate-300/80 bg-white/80 text-slate-700 hover:bg-white
                  dark:border-white/15 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${className || ''}`}
    >
      {isDark ? <Moon size={16} /> : <Sun size={16} />}
      <span className="hidden sm:inline">{isDark ? '深色' : '浅色'}</span>
    </button>
  );
};

export default ThemeToggle;
