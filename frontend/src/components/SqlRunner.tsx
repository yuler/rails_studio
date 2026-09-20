import React, { useState } from 'react';
import { Play, Download, Clock, Database, AlertCircle, FileText } from 'lucide-react';
import { executeQuery } from '../api';
import { QueryResult, TableMeta } from '../types';

interface SqlRunnerProps {
  tables: TableMeta[];
}

export const SqlRunner: React.FC<SqlRunnerProps> = ({ tables }) => {
  const [sql, setSql] = useState<string>(() => {
    const firstTable = tables[0]?.name || 'users';
    return `SELECT * FROM ${firstTable} LIMIT 25;`;
  });
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    if (!sql.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await executeQuery(sql);
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Query execution failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  };

  const exportCSV = () => {
    if (!result || !result.columns || !result.rows) return;
    const header = result.columns.join(',');
    const rows = result.rows.map((row) =>
      row
        .map((cell) => {
          if (cell === null || cell === undefined) return '';
          const str = String(cell);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    );
    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `query_result_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-zinc-950 select-none">
      {/* Query Editor Box */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/40 flex flex-col space-y-3">
        {/* Quick templates */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs text-zinc-400">
          <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <FileText size={12} /> Templates:
          </span>
          {tables.slice(0, 5).map((t) => (
            <button
              key={t.name}
              onClick={() => setSql(`SELECT * FROM ${t.name} LIMIT 25;`)}
              className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[11px] shrink-0 border border-zinc-700/50 transition"
            >
              {t.name}
            </button>
          ))}
          <button
            onClick={() => setSql(`SELECT name, type FROM sqlite_master WHERE type='table';`)}
            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[11px] shrink-0 border border-zinc-700/50 transition"
          >
            sqlite_master
          </button>
        </div>

        {/* Editor Area */}
        <div className="relative">
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            placeholder="Type your SQL query here... (e.g. SELECT * FROM users WHERE active = 1)"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 resize-y"
          />
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-300 text-[10px]">
              Ctrl+Enter
            </kbd>
            <span>or</span>
            <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-300 text-[10px]">
              ⌘+Enter
            </kbd>
            <span>to execute</span>
          </div>

          <button
            onClick={handleRun}
            disabled={loading || !sql.trim()}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white font-medium text-xs shadow-sm transition disabled:opacity-50"
          >
            <Play size={13} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Running...' : 'Run Query'}</span>
          </button>
        </div>
      </div>

      {/* Results Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Results Bar */}
        {result && (
          <div className="px-4 py-2 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-400">
            <div className="flex items-center space-x-3">
              <span className="flex items-center gap-1 text-zinc-300">
                <Database size={13} className="text-zinc-500" />
                {result.count} {result.count === 1 ? 'row' : 'rows'} returned
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-zinc-400">
                <Clock size={13} className="text-zinc-500" />
                {result.duration_ms} ms
              </span>
            </div>

            {result.rows && result.rows.length > 0 && (
              <button
                onClick={exportCSV}
                className="flex items-center space-x-1 text-zinc-400 hover:text-zinc-200 transition text-[11px]"
              >
                <Download size={12} />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="p-4 m-4 rounded-lg bg-red-950/40 border border-red-800/60 text-red-300 text-xs font-mono flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Query Error:</p>
              <p className="mt-1 whitespace-pre-wrap">{error}</p>
            </div>
          </div>
        )}

        {/* Results Table */}
        <div className="flex-1 overflow-auto">
          {result && result.columns.length > 0 ? (
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead className="bg-zinc-900 sticky top-0 border-b border-zinc-800 z-10">
                <tr>
                  <th className="p-2.5 w-12 text-zinc-500 text-[10px] uppercase font-medium border-r border-zinc-800/60 text-center">
                    #
                  </th>
                  {result.columns.map((col) => (
                    <th
                      key={col}
                      className="p-2.5 text-zinc-300 font-medium text-xs border-r border-zinc-800/60 whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {result.rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-zinc-900/50 transition">
                    <td className="p-2.5 text-zinc-600 text-center text-[10px] border-r border-zinc-800/40">
                      {rowIdx + 1}
                    </td>
                    {row.map((cell, cellIdx) => (
                      <td
                        key={cellIdx}
                        className="p-2.5 text-zinc-200 border-r border-zinc-800/40 whitespace-nowrap max-w-xs truncate"
                      >
                        {cell === null ? (
                          <span className="text-zinc-600 italic">null</span>
                        ) : typeof cell === 'boolean' ? (
                          <span className={cell ? 'text-emerald-400' : 'text-red-400'}>
                            {String(cell)}
                          </span>
                        ) : (
                          String(cell)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : !loading && !error ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 font-mono text-xs space-y-1">
              <span>Enter a query above and hit Run Query</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
