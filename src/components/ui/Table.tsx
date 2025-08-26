// 表格
import React from 'react';

interface TableProps {
  headers: React.ReactNode[];
  rows: React.ReactNode[][];
  striped?: boolean;
  hoverable?: boolean;
  dense?: boolean;
}

export default function Table({ headers, rows, striped = true, hoverable = true, dense = false }: TableProps) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm
                    dark:bg-[#1E1E1E]/70 dark:border-white/10 dark:backdrop-blur">
      <table className="w-full text-left">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">
            {headers.map((h, i) => (
              <th key={i} className={`px-4 ${dense ? 'py-2' : 'py-3'} border-b border-slate-200 dark:border-white/10`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-sm text-slate-700 dark:text-slate-200">
          {rows.map((row, ri) => (
            <tr
              key={ri}
              className={`${striped && ri % 2 === 1
                  ? 'bg-slate-50 dark:bg-white/5'
                  : ''
                } ${hoverable ? 'hover:bg-sky-50 dark:hover:bg-white/10' : ''}`}
            >
              {row.map((cell, ci) => (
                <td key={ci} className={`px-4 ${dense ? 'py-2.5' : 'py-3.5'} border-b border-slate-100 dark:border-white/5`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
