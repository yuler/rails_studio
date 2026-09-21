import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, Link2, Check, ChevronDown } from 'lucide-react';
import { fetchRecords } from '../api';

export interface ForeignKeySelectProps {
  targetTable: string;
  value: any;
  onChange: (val: any) => void;
  isNullable?: boolean;
  onCommit?: () => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  inline?: boolean;
}

export const ForeignKeySelect: React.FC<ForeignKeySelectProps> = ({
  targetTable,
  value,
  onChange,
  isNullable = true,
  onCommit,
  onCancel,
  autoFocus = false,
  inline = false
}) => {
  const [open, setOpen] = useState(inline);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<Record<string, any>[]>([]);
  const [search, setSearch] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownHeight = 250;
      const spaceBelow = window.innerHeight - rect.bottom;
      const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

      const top = showAbove ? Math.max(8, rect.top - dropdownHeight - 4) : rect.bottom + 4;
      const width = Math.max(rect.width, 240);
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));

      setDropdownPos({ top, left, width });
    }
  };

  useEffect(() => {
    if (open) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [open]);

  useEffect(() => {
    let active = true;
    async function loadForeignRecords() {
      setLoading(true);
      try {
        const res = await fetchRecords(targetTable, 1, 50);
        if (active) {
          setRecords(res.records);
        }
      } catch {
        // Fallback to manual ID if loading fails
      } finally {
        if (active) setLoading(false);
      }
    }
    loadForeignRecords();
    return () => {
      active = false;
    };
  }, [targetTable]);

  // Focus search input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
        if (inline) {
          onCommit?.();
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inline, onCommit]);

  const getRecordLabel = (rec: Record<string, any>) => {
    const id = rec.id !== undefined ? rec.id : Object.values(rec)[0];
    const descriptiveField =
      rec.name ||
      rec.title ||
      rec.email ||
      rec.slug ||
      rec.username ||
      rec.label ||
      rec.description;

    if (descriptiveField) {
      return `#${id} - ${descriptiveField}`;
    }
    return `#${id}`;
  };

  const filteredRecords = records.filter((rec) => {
    const q = search.toLowerCase();
    const idStr = String(rec.id ?? Object.values(rec)[0]);
    if (idStr.includes(q)) return true;
    const desc = (rec.name || rec.title || rec.email || rec.slug || rec.username || '') + '';
    return desc.toLowerCase().includes(q);
  });

  const selectedRecord = records.find(
    (r) => String(r.id ?? Object.values(r)[0]) === String(value)
  );

  const handleSelect = (selectedId: any) => {
    onChange(selectedId);
    setOpen(false);
    onCommit?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      onCancel?.();
    }
  };

  if (manualMode) {
    return (
      <div className="flex items-center space-x-2">
        <input
          autoFocus={autoFocus}
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onCommit?.();
            if (e.key === 'Escape') onCancel?.();
          }}
          placeholder={`ID in ${targetTable}`}
          className="w-full bg-white dark:bg-zinc-900 border border-blue-500 dark:border-blue-400 rounded px-2 py-1 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none font-mono shadow-xs"
        />
        <button
          type="button"
          onClick={() => setManualMode(false)}
          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline shrink-0"
        >
          List
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${inline ? 'min-w-[180px] w-full h-full' : 'w-full'}`} onKeyDown={handleKeyDown}>
      <div
        onClick={() => setOpen(!open)}
        className={`w-full bg-white dark:bg-zinc-900 ${
          inline
            ? 'h-full border-2 border-blue-500 dark:border-blue-400 px-2 py-0 rounded-none'
            : 'border border-slate-300 dark:border-zinc-800 py-1.5 px-2.5 rounded'
        } text-xs font-mono cursor-pointer flex items-center justify-between transition hover:border-slate-400 dark:hover:border-zinc-700 shadow-xs ${
          open ? 'ring-1 ring-blue-500 dark:ring-blue-400' : ''
        }`}
      >
        <div className="flex items-center space-x-1.5 truncate">
          <Link2 size={12} className="text-blue-500 shrink-0" />
          {selectedRecord ? (
            <span className="text-slate-900 dark:text-zinc-100 font-medium truncate">
              {getRecordLabel(selectedRecord)}
            </span>
          ) : value !== null && value !== undefined && value !== '' ? (
            <span className="text-slate-900 dark:text-zinc-100 font-medium truncate">
              #{value}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-zinc-500 italic truncate text-[11px]">
              {isNullable ? 'Select foreign relation...' : 'Select record...'}
            </span>
          )}
        </div>
        <ChevronDown size={13} className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && dropdownPos && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
            zIndex: 99999
          }}
          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-2xl overflow-hidden flex flex-col text-xs animate-in fade-in zoom-in-95 duration-100 font-mono"
        >
          {/* Search bar inside dropdown */}
          <div className="p-2 border-b border-slate-100 dark:border-zinc-800 flex items-center space-x-2 bg-slate-50/80 dark:bg-zinc-950/60">
            <Search size={12} className="text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder={`Search in ${targetTable}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredRecords.length > 0) {
                    const recId = filteredRecords[0].id ?? Object.values(filteredRecords[0])[0];
                    handleSelect(recId);
                  }
                }
              }}
              className="flex-1 bg-transparent text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none font-mono"
            />
          </div>

          {/* List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/40">
            {isNullable && (
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition flex items-center justify-between italic"
              >
                <span>None (null)</span>
                {!value && <Check size={12} className="text-emerald-500" />}
              </button>
            )}

            {loading ? (
              <div className="p-3 text-center text-slate-400 dark:text-zinc-500 font-mono text-xs">
                Loading records...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-3 text-center text-slate-400 dark:text-zinc-500 font-mono text-xs">
                No matching records
              </div>
            ) : (
              filteredRecords.map((rec) => {
                const recId = rec.id !== undefined ? rec.id : Object.values(rec)[0];
                const isSelected = String(value) === String(recId);
                const label = getRecordLabel(rec);

                return (
                  <button
                    key={recId}
                    type="button"
                    onClick={() => handleSelect(recId)}
                    className={`w-full text-left px-3 py-1.5 text-xs font-mono transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <span className="truncate pr-2">{label}</span>
                    {isSelected && <Check size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Fallback to manual raw ID */}
          <div className="p-1.5 border-t border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/50 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setManualMode(true);
                setOpen(false);
              }}
              className="text-[10px] text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 underline"
            >
              Enter raw ID manually
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
