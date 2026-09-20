import React, { useState, useRef, useEffect } from 'react';
import { Table, Search, Key, Link2, Layers } from 'lucide-react';
import { TableMeta } from '../types';

interface SidebarProps {
  tables: TableMeta[];
  selectedTable: string | null;
  onSelectTable: (name: string) => void;
  loading: boolean;
  onOpenCommandPalette?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tables,
  selectedTable,
  onSelectTable,
  loading,
  onOpenCommandPalette
}) => {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  // Shortcut '/' to focus filter tables input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;

      if (!isTyping && e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 flex flex-col h-[calc(100vh-3.5rem)] select-none transition-colors">
      {/* Search Tables Input */}
      <div className="p-3 border-b border-slate-200 dark:border-zinc-800">
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400 dark:text-zinc-500 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Filter tables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                inputRef.current?.blur();
              }
            }}
            className="w-full bg-white dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800 rounded-md pl-8 pr-8 py-1.5 text-xs text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-700 shadow-sm dark:shadow-none"
          />
          <kbd
            className="absolute right-2 px-1.5 py-0.5 text-[10px] font-mono rounded border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 shadow-xs pointer-events-none"
            title="Press / to search tables"
          >
            /
          </kbd>
        </div>
      </div>

      {/* Tables List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center justify-between">
          <span>Tables ({filteredTables.length})</span>
        </div>

        {loading && tables.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 dark:text-zinc-500 font-mono">
            Loading tables...
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 dark:text-zinc-500 font-mono">
            No tables match "{search}"
          </div>
        ) : (
          filteredTables.map((tbl) => {
            const isSelected = selectedTable === tbl.name;
            return (
              <button
                key={tbl.name}
                onClick={() => onSelectTable(tbl.name)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-mono transition-all text-left group ${
                  isSelected
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-medium shadow-sm border border-slate-200 dark:border-zinc-700/60'
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-zinc-200 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <Table
                    size={14}
                    className={`${
                      isSelected ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-400'
                    }`}
                  />
                  <span className="truncate">{tbl.name}</span>
                </div>

                <div className="flex items-center space-x-1 pl-2">
                  {tbl.foreign_keys_count > 0 && (
                    <Link2 size={11} className="text-slate-400 dark:text-zinc-600" title={`${tbl.foreign_keys_count} foreign keys`} />
                  )}
                  {tbl.primary_keys.length > 0 && (
                    <Key size={11} className="text-slate-400 dark:text-zinc-600" title={`Primary key: ${tbl.primary_keys.join(', ')}`} />
                  )}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-zinc-700/80 text-slate-700 dark:text-zinc-200'
                        : 'bg-slate-200/60 dark:bg-zinc-950 text-slate-500 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-400'
                    }`}
                  >
                    {tbl.row_count.toLocaleString()}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-100/50 dark:bg-zinc-950/40 text-[11px] text-slate-500 dark:text-zinc-500 flex items-center justify-between font-mono">
        <div className="flex items-center space-x-1.5">
          <Layers size={13} className="text-slate-400 dark:text-zinc-500" />
          <span>{tables.length} schemas loaded</span>
        </div>
      </div>
    </aside>
  );
};
