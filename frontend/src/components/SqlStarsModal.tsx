import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Star, Trash2, X } from 'lucide-react';

export interface StarredQuery {
  id: string;
  name: string;
  sql: string;
  createdAt: number;
}

interface SqlStarsModalProps {
  isOpen: boolean;
  stars: StarredQuery[];
  currentSql: string;
  onClose: () => void;
  onApply: (sql: string) => void;
  onStarCurrent: () => void;
  onRemove: (id: string) => void;
}

export const SqlStarsModal: React.FC<SqlStarsModalProps> = ({
  isOpen,
  stars,
  currentSql,
  onClose,
  onApply,
  onStarCurrent,
  onRemove
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const currentTrimmed = currentSql.trim();
  const currentStarred = stars.some((s) => s.sql.trim() === currentTrimmed);

  useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    setSelectedIndex(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stars;
    return stars.filter((item) => {
      const name = (item.name || '').toLowerCase();
      return name.includes(q) || item.sql.toLowerCase().includes(q);
    });
  }, [stars, query]);

  useEffect(() => {
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, selectedIndex]);

  useEffect(() => {
    const activeEl = listRef.current?.querySelector('[data-active="true"]');
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  const applyIndex = (index: number) => {
    const item = filtered[index];
    if (!item) return;
    onApply(item.sql);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filtered.length === 0) return;
      setSelectedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filtered.length === 0) return;
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      applyIndex(selectedIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'Delete' || (e.key === 'Backspace' && query === '')) {
      const item = filtered[selectedIndex];
      if (!item) return;
      e.preventDefault();
      onRemove(item.id);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-slate-200 dark:border-zinc-800 gap-3">
          <Search size={16} className="text-slate-400 dark:text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search stars by name or SQL..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none"
          />
          {currentTrimmed && (
            <button
              type="button"
              onClick={onStarCurrent}
              className={`shrink-0 px-2 py-1 text-[11px] font-mono rounded-md border transition flex items-center gap-1 ${
                currentStarred
                  ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                  : 'border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-700'
              }`}
              title={currentStarred ? 'Rename starred query' : 'Star current query'}
            >
              <Star size={12} className={currentStarred ? 'fill-current' : ''} />
              <span>{currentStarred ? 'Edit star' : 'Star current'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 p-1 rounded-md"
            aria-label="Close stars"
          >
            <X size={16} />
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto p-2 min-h-[220px]">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-zinc-500 text-xs font-mono">
              {stars.length === 0
                ? 'No starred queries yet. Press Ctrl+S in the editor to save one with a name.'
                : `No stars match "${query}"`}
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((item, index) => {
                const isActive = index === selectedIndex;
                return (
                  <div
                    key={item.id}
                    data-active={isActive}
                    onClick={() => applyIndex(index)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`group flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100'
                        : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    <Star
                      size={13}
                      className="mt-0.5 shrink-0 text-amber-500 fill-amber-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate text-slate-900 dark:text-zinc-100">
                        {item.name?.trim() || item.sql.split('\n')[0]}
                      </div>
                      <pre className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-zinc-400 whitespace-pre-wrap break-all line-clamp-3">
                        {item.sql}
                      </pre>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(item.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 shrink-0"
                      title="Remove star"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-2 bg-slate-50 dark:bg-zinc-950/80 border-t border-slate-200 dark:border-zinc-800 flex items-center gap-4 text-[11px] text-slate-400 dark:text-zinc-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 text-[9px] font-mono rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">Up</kbd>
            <kbd className="px-1 py-0.5 text-[9px] font-mono rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">Down</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 text-[9px] font-mono rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">Enter</kbd>
            insert
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 text-[9px] font-mono rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">Esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
};
