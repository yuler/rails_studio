import React, { useState, useEffect, useRef } from 'react';
import {
  Key,
  Link2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Plus,
  Trash2,
  RefreshCw,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  Braces,
  Maximize2,
  Check,
  Edit2,
  AlertCircle
} from 'lucide-react';
import { TableSchema, ColumnMeta, FilterCondition, StagedChange } from '../types';
import { ForeignKeySelect } from './ForeignKeySelect';
import { BooleanToggle, coerceBoolean } from './BooleanToggle';

function formatForDateTimeLocal(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
  } catch {}
  if (str.includes(' ') && !str.includes('T')) {
    const parts = str.split(' ');
    const timePart = parts[1]?.split('.')[0] || '00:00';
    return `${parts[0]}T${timePart.slice(0, 5)}`;
  }
  if (str.includes('T')) {
    const parts = str.split('T');
    const timePart = parts[1]?.split('.')[0]?.replace('Z', '') || '00:00';
    return `${parts[0]}T${timePart.slice(0, 5)}`;
  }
  return str;
}

function formatForDate(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
  } catch {}
  return str.split('T')[0].split(' ')[0];
}

function formatForTime(val: any): string {
  if (!val) return '';
  const str = String(val).trim();
  if (str.includes(' ')) {
    return str.split(' ')[1].slice(0, 5);
  }
  if (str.includes('T')) {
    return str.split('T')[1].slice(0, 5);
  }
  return str.slice(0, 5);
}

interface TableViewProps {
  schema: TableSchema;
  records: Record<string, any>[];
  totalCount: number;
  page: number;
  perPage: number;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  filters: FilterCondition[];
  loading: boolean;
  stagedChanges: Map<string, StagedChange>;
  onPageChange: (newPage: number) => void;
  onPerPageChange: (newPerPage: number) => void;
  onSortChange: (column: string) => void;
  onFiltersChange: (newFilters: FilterCondition[]) => void;
  onRefresh: () => void;
  onOpenInsertModal: () => void;
  onStageCellChange: (rowId: any, column: string, originalVal: any, newVal: any) => void;
  onDeleteSelectedRows: (rowIds: any[]) => void | boolean | Promise<void | boolean>;
  onOpenForeignKey: (targetTable: string, targetId: any) => void;
  showFilterBar?: boolean;
  onToggleFilterBar?: () => void;
  navActive?: boolean;
  onActivate?: () => void;
}

export const TableView: React.FC<TableViewProps> = ({
  schema,
  records,
  totalCount,
  page,
  perPage,
  sortBy,
  sortOrder,
  filters,
  loading,
  stagedChanges,
  onPageChange,
  onPerPageChange,
  onSortChange,
  onFiltersChange,
  onRefresh,
  onOpenInsertModal,
  onStageCellChange,
  onDeleteSelectedRows,
  onOpenForeignKey,
  showFilterBar: propShowFilterBar,
  onToggleFilterBar,
  navActive = false,
  onActivate
}) => {
  const [selectedRowIds, setSelectedRowIds] = useState<Set<any>>(new Set());
  const [focusedRowIndex, setFocusedRowIndex] = useState(0);
  const [internalShowFilterBar, setInternalShowFilterBar] = useState(false);
  const showFilterBar = propShowFilterBar !== undefined ? propShowFilterBar : internalShowFilterBar;
  const toggleFilterBar = onToggleFilterBar || (() => setInternalShowFilterBar((prev) => !prev));

  // Cell selection & inline editing state (like Prisma Studio)
  const [focusedCell, setFocusedCell] = useState<{ rowId: any; column: string } | null>(null);
  const [editingCell, setEditingCell] = useState<{ rowId: any; column: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Modal editor for large text / JSON / popover edit
  const [modalEditor, setModalEditor] = useState<{
    rowId: any;
    column: string;
    value: string;
    originalVal: any;
    type: string;
  } | null>(null);

  // Refresh spinning animation state
  const [isSpinning, setIsSpinning] = useState(false);

  // Local draft filters for the filter panel
  const [draftFilters, setDraftFilters] = useState<FilterCondition[]>(filters);

  const inputEditRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  useEffect(() => {
    setSelectedRowIds(new Set());
    setEditingCell(null);
    setFocusedCell(null);
    setFocusedRowIndex(0);
  }, [schema.table_name, page]);

  // Focus and select input once when entering edit mode
  useEffect(() => {
    if (editingCell && inputEditRef.current) {
      inputEditRef.current.focus();
      if ('select' in inputEditRef.current && typeof (inputEditRef.current as HTMLInputElement).select === 'function') {
        (inputEditRef.current as HTMLInputElement).select();
      }
    }
  }, [editingCell?.rowId, editingCell?.column]);

  const handleDeleteSelected = async () => {
    if (selectedRowIds.size === 0) return;
    const ok = await onDeleteSelectedRows(Array.from(selectedRowIds));
    if (ok !== false) setSelectedRowIds(new Set());
  };

  useEffect(() => {
    if (!modalEditor) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || !!target?.isContentEditable;
      if (typing) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setModalEditor(null);
    };
    window.addEventListener('keydown', onEscape, true);
    return () => window.removeEventListener('keydown', onEscape, true);
  }, [modalEditor]);

  const primaryKeyCol = schema.primary_keys[0] || 'id';

  const getRowId = (record: Record<string, any>) => {
    if (schema.primary_keys.length > 1) {
      return schema.primary_keys.map((k) => record[k]).join(',');
    }
    return record[primaryKeyCol];
  };

  const handleRefreshClick = () => {
    setIsSpinning(true);
    onRefresh();
    setTimeout(() => setIsSpinning(false), 750);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(records.map(getRowId));
      setSelectedRowIds(allIds);
    } else {
      setSelectedRowIds(new Set());
    }
  };

  const handleToggleRow = (rowId: any) => {
    const next = new Set(selectedRowIds);
    if (next.has(rowId)) {
      next.delete(rowId);
    } else {
      next.add(rowId);
    }
    setSelectedRowIds(next);
  };

  useEffect(() => {
    if (focusedRowIndex >= records.length) {
      setFocusedRowIndex(Math.max(0, records.length - 1));
    }
  }, [records.length, focusedRowIndex]);

  useEffect(() => {
    if (!navActive) return;
    const el = document.querySelector(`[data-row-focus="${focusedRowIndex}"]`);
    if (el) (el as HTMLElement).scrollIntoView({ block: 'nearest' });
  }, [focusedRowIndex, navActive]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable;
      if (isTyping || editingCell || modalEditor || e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleRefreshClick();
        return;
      }

      if ((e.key === 'd' || e.key === 'D') && selectedRowIds.size > 0) {
        e.preventDefault();
        void handleDeleteSelected();
        return;
      }

      if (!navActive || records.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedRowIndex((i) => Math.min(records.length - 1, i + 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedRowIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        const row = records[focusedRowIndex];
        if (row) handleToggleRow(getRowId(row));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navActive, records, focusedRowIndex, editingCell, modalEditor, selectedRowIds, onRefresh, onDeleteSelectedRows]);

  const getCellCurrentValue = (rowId: any, column: string, originalVal: any) => {
    const key = `${rowId}:${column}`;
    const staged = stagedChanges.get(key);
    return staged ? staged.newValue : originalVal;
  };

  const handleStartEdit = (rowId: any, column: string, currentVal: any) => {
    const colMeta = schema.columns.find((c) => c.name === column);
    if (colMeta?.primary && (colMeta.type === 'integer' || colMeta.name === 'id')) {
      return; // Primary keys are not editable
    }

    const val = getCellCurrentValue(rowId, column, currentVal);

    // If boolean, toggle directly or enter edit
    if (colMeta?.type === 'boolean') {
      const nextBool = coerceBoolean(val) !== true;
      onStageCellChange(rowId, column, currentVal, nextBool);
      return;
    }

    setFocusedCell({ rowId, column });
    setEditingCell({ rowId, column });

    if (colMeta?.foreign_key) {
      setEditValue(val === null || val === undefined ? '' : val);
      return;
    }

    if (colMeta?.type === 'datetime' || colMeta?.type === 'timestamp') {
      setEditValue(formatForDateTimeLocal(val));
      return;
    }

    if (colMeta?.type === 'date') {
      setEditValue(formatForDate(val));
      return;
    }

    if (colMeta?.type === 'time') {
      setEditValue(formatForTime(val));
      return;
    }

    setEditValue(val === null || val === undefined ? '' : String(val));
  };

  const handleCommitEdit = (nextCellColOffset = 0) => {
    if (!editingCell) return;
    const { rowId, column } = editingCell;
    const record = records.find((r) => getRowId(r) === rowId);
    if (!record) return;

    const originalVal = record[column];
    const colMeta = schema.columns.find((c) => c.name === column);

    let parsedVal: any = editValue;
    if (editValue === '' && colMeta?.null && colMeta.type !== 'string' && colMeta.type !== 'text') {
      parsedVal = null;
    } else if (colMeta?.type === 'integer') {
      parsedVal = editValue === '' ? null : parseInt(editValue, 10);
    } else if (colMeta?.type === 'float' || colMeta?.type === 'decimal') {
      parsedVal = editValue === '' ? null : parseFloat(editValue);
    } else if (colMeta?.type === 'boolean') {
      parsedVal = editValue === '' ? (colMeta.null ? null : false) : editValue === 'true' || editValue === true;
    } else if (colMeta?.type === 'datetime' || colMeta?.type === 'timestamp' || colMeta?.type === 'date' || colMeta?.type === 'time') {
      parsedVal = editValue === '' ? (colMeta.null ? null : '') : editValue;
    }

    onStageCellChange(rowId, column, originalVal, parsedVal);
    setEditingCell(null);

    // If Tab or Shift+Tab navigation was requested, move to next column in same row
    if (nextCellColOffset !== 0) {
      const colIdx = schema.columns.findIndex((c) => c.name === column);
      const nextColIdx = colIdx + nextCellColOffset;
      if (nextColIdx >= 0 && nextColIdx < schema.columns.length) {
        const nextCol = schema.columns[nextColIdx];
        if (!nextCol.primary) {
          setTimeout(() => {
            handleStartEdit(rowId, nextCol.name, record[nextCol.name]);
          }, 50);
        }
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
  };

  // Cell keyboard navigation & shortcuts
  const handleCellKeyDown = (e: React.KeyboardEvent, rowId: any, column: string, currentVal: any) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleStartEdit(rowId, column, currentVal);
    }
  };

  // Open modal editor for large text / JSON
  const handleOpenModalEditor = (rowId: any, column: string, originalVal: any, type: string) => {
    const val = getCellCurrentValue(rowId, column, originalVal);
    setModalEditor({
      rowId,
      column,
      value: val === null || val === undefined ? '' : typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val),
      originalVal,
      type
    });
  };

  const handleSaveModalEditor = () => {
    if (!modalEditor) return;
    const { rowId, column, value, originalVal, type } = modalEditor;
    let parsed: any = value;
    if (type === 'json' || type === 'jsonb') {
      try {
        parsed = JSON.parse(value);
      } catch {
        // Keep string if not valid json
      }
    }
    onStageCellChange(rowId, column, originalVal, parsed);
    setModalEditor(null);
  };

  // Filter actions
  const addDraftFilter = () => {
    const firstCol = schema.columns[0]?.name || 'id';
    setDraftFilters([
      ...draftFilters,
      {
        id: String(Date.now()),
        column: firstCol,
        op: 'contains',
        value: ''
      }
    ]);
  };

  const removeDraftFilter = (id: string) => {
    setDraftFilters(draftFilters.filter((f) => f.id !== id));
  };

  const applyFilters = () => {
    const validFilters = draftFilters.filter(
      (f) => f.op === 'is_null' || f.op === 'is_not_null' || f.value.trim() !== ''
    );
    onFiltersChange(validFilters);
  };

  const clearAllFilters = () => {
    setDraftFilters([]);
    onFiltersChange([]);
  };

  const removeAppliedFilter = (index: number) => {
    const next = [...filters];
    next.splice(index, 1);
    onFiltersChange(next);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  const renderColumnIcon = (col: ColumnMeta) => {
    if (col.primary) return <Key size={12} className="text-amber-500 dark:text-amber-400 shrink-0" />;
    if (col.foreign_key) return <Link2 size={12} className="text-blue-500 dark:text-blue-400 shrink-0" />;
    switch (col.type) {
      case 'integer':
      case 'float':
      case 'decimal':
        return <Hash size={12} className="text-emerald-500 dark:text-emerald-400 shrink-0" />;
      case 'boolean':
        return <ToggleLeft size={12} className="text-purple-500 dark:text-purple-400 shrink-0" />;
      case 'datetime':
      case 'date':
      case 'time':
        return <Calendar size={12} className="text-orange-500 dark:text-orange-400 shrink-0" />;
      case 'json':
      case 'jsonb':
        return <Braces size={12} className="text-sky-500 dark:text-sky-400 shrink-0" />;
      default:
        return <Type size={12} className="text-slate-400 dark:text-zinc-400 shrink-0" />;
    }
  };

  return (
    <div
      className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-zinc-950 select-none transition-colors"
      onMouseDown={() => onActivate?.()}
    >
      {/* Action Bar */}
      <div className="h-[46px] px-2.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/30 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          {/* Filter toggle */}
          <button
            onClick={toggleFilterBar}
            className={`px-2.5 py-1.5 rounded-md flex items-center space-x-1.5 transition border ${
              filters.length > 0 || showFilterBar
                ? 'bg-slate-200/90 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 font-medium'
                : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 shadow-xs'
            }`}
            title="Toggle filters (F)"
          >
            <Filter size={13} />
            <span>Filter</span>
            {filters.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-500 text-white dark:bg-red-500/30 dark:text-red-300 text-[10px] flex items-center justify-center font-mono">
                {filters.length}
              </span>
            )}
            <kbd className="hidden sm:inline-flex px-1.5 py-0.2 text-[9px] font-mono rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500">
              F
            </kbd>
          </button>

          {/* Refresh button with dedicated spin animation and shortcut badge */}
          <button
            onClick={handleRefreshClick}
            disabled={loading || isSpinning}
            className={`px-2.5 py-1.5 rounded-md border transition shadow-xs flex items-center space-x-1.5 ${
              loading || isSpinning
                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400'
                : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
            title="Refresh records (R)"
          >
            <RefreshCw
              size={13}
              className={`transition-all ${
                loading || isSpinning ? 'animate-spin text-red-500' : ''
              }`}
            />
            <span className="hidden sm:inline">{loading || isSpinning ? 'Refreshing...' : 'Refresh'}</span>
            <kbd className="hidden sm:inline-flex px-1.5 py-0.2 text-[9px] font-mono rounded bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500">
              R
            </kbd>
          </button>

          {/* Inline Edit hint */}
          <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono hidden xl:inline-block pl-2">
            Tip: Double-click or select cell & press Enter to edit inline
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {selectedRowIds.size > 0 && (
            <button
              onClick={() => void handleDeleteSelected()}
              className="px-3 py-1.5 rounded-md bg-rose-50 dark:bg-red-950/80 border border-rose-200 dark:border-red-800 text-rose-700 dark:text-red-300 hover:bg-rose-100 dark:hover:bg-red-900/80 transition flex items-center space-x-1.5"
              title="Delete selected rows (D)"
            >
              <Trash2 size={13} />
              <span>Delete ({selectedRowIds.size})</span>
              <kbd className="hidden sm:inline-flex px-1.5 py-0.2 text-[9px] font-mono rounded bg-rose-100 dark:bg-red-900/80 border border-rose-200 dark:border-red-800 text-rose-600 dark:text-red-300">
                D
              </kbd>
            </button>
          )}

          <button
            onClick={onOpenInsertModal}
            className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-medium transition flex items-center space-x-1.5 shadow-sm"
          >
            <Plus size={14} />
            <span>Add Row</span>
            <kbd className="hidden sm:inline-flex px-1 py-0.2 text-[9px] font-mono rounded bg-slate-800 dark:bg-zinc-200 text-slate-300 dark:text-zinc-700">N</kbd>
          </button>
        </div>
      </div>

      {/* Active Filter Badges Strip (Item 8: clean modern filter layout) */}
      {filters.length > 0 && !showFilterBar && (
        <div className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800/80 flex items-center space-x-2 overflow-x-auto text-xs font-mono">
          <span className="text-[10px] uppercase font-semibold text-slate-400 dark:text-zinc-500 shrink-0 flex items-center gap-1">
            <Filter size={11} /> Filters:
          </span>
          {filters.map((f, idx) => (
            <span
              key={idx}
              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-[11px] shadow-2xs"
            >
              <span className="font-semibold text-slate-900 dark:text-white">{f.column}</span>
              <span className="text-slate-400 dark:text-zinc-500">{f.op}</span>
              {f.value && <span className="text-red-600 dark:text-red-400 font-medium truncate max-w-[120px]">"{f.value}"</span>}
              <button
                onClick={() => removeAppliedFilter(idx)}
                className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-full"
              >
                <X size={11} />
              </button>
            </span>
          ))}
          <button
            onClick={clearAllFilters}
            className="text-[11px] text-slate-400 hover:text-red-500 dark:hover:text-red-400 underline shrink-0 pl-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Filter Editor Panel (Item 8: modern card layout) */}
      {showFilterBar && (
        <div className="p-3.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/90 dark:bg-zinc-900/60 flex flex-col space-y-3 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-zinc-400">
            <div className="flex items-center space-x-2">
              <Filter size={13} className="text-slate-500 dark:text-zinc-400" />
              <span className="font-semibold text-slate-800 dark:text-zinc-200 text-xs">
                Filter Table Records
              </span>
              <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
                ({draftFilters.length} {draftFilters.length === 1 ? 'condition' : 'conditions'})
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {draftFilters.length > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200 px-2 py-1 rounded hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={applyFilters}
                className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-500 text-white font-medium text-xs transition shadow-xs flex items-center gap-1"
              >
                <Check size={12} />
                <span>Apply Filters</span>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {draftFilters.length === 0 ? (
              <div className="text-center p-3 text-slate-400 dark:text-zinc-500 font-mono text-xs bg-white/60 dark:bg-zinc-950/40 rounded-lg border border-dashed border-slate-200 dark:border-zinc-800">
                No active filter conditions. Click below to add one.
              </div>
            ) : (
              draftFilters.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center space-x-2 text-xs bg-white dark:bg-zinc-950 p-2 rounded-lg border border-slate-200 dark:border-zinc-800 shadow-2xs"
                >
                  {/* Column */}
                  <select
                    value={f.column}
                    onChange={(e) => {
                      const next = draftFilters.map((df) =>
                        df.id === f.id ? { ...df, column: e.target.value } : df
                      );
                      setDraftFilters(next);
                    }}
                    className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-slate-800 dark:text-zinc-200 font-mono text-xs focus:outline-none focus:border-slate-400 dark:focus:border-zinc-700"
                  >
                    {schema.columns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.type})
                      </option>
                    ))}
                  </select>

                  {/* Operator */}
                  <select
                    value={f.op}
                    onChange={(e) => {
                      const next = draftFilters.map((df) =>
                        df.id === f.id ? { ...df, op: e.target.value } : df
                      );
                      setDraftFilters(next);
                    }}
                    className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-slate-800 dark:text-zinc-200 font-mono text-xs focus:outline-none focus:border-slate-400 dark:focus:border-zinc-700"
                  >
                    <option value="contains">contains</option>
                    <option value="eq">equals (=)</option>
                    <option value="not_eq">not equals (!=)</option>
                    <option value="starts_with">starts with</option>
                    <option value="ends_with">ends with</option>
                    <option value="gt">&gt; (greater than)</option>
                    <option value="gte">&gt;= (greater or equal)</option>
                    <option value="lt">&lt; (less than)</option>
                    <option value="lte">&lt;= (less or equal)</option>
                    <option value="is_null">is null</option>
                    <option value="is_not_null">is not null</option>
                  </select>

                  {/* Value */}
                  {f.op !== 'is_null' && f.op !== 'is_not_null' && (
                    <input
                      type="text"
                      placeholder="Filter value... (press Enter to apply)"
                      value={f.value}
                      onChange={(e) => {
                        const next = draftFilters.map((df) =>
                          df.id === f.id ? { ...df, value: e.target.value } : df
                        );
                        setDraftFilters(next);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') applyFilters();
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.blur();
                        }
                      }}
                      className="flex-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-slate-800 dark:text-zinc-200 font-mono text-xs focus:outline-none focus:border-slate-400 dark:focus:border-zinc-700"
                    />
                  )}

                  <button
                    onClick={() => removeDraftFilter(f.id)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                    title="Remove condition"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}

            <button
              onClick={addDraftFilter}
              className="text-xs text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 flex items-center space-x-1.5 px-2 py-1 rounded hover:bg-slate-200/50 dark:hover:bg-zinc-800/50 transition font-mono"
            >
              <Plus size={13} className="text-red-500" />
              <span>Add condition</span>
            </button>
          </div>
        </div>
      )}

      {/* Spreadsheet Table Container */}
      <div className="flex-1 overflow-auto relative min-h-0">
        <table className="w-full text-left font-mono text-xs border-separate border-spacing-0">
          {/* Table Header */}
          <thead className="bg-slate-100/90 dark:bg-zinc-900 sticky top-0 border-b border-slate-200 dark:border-zinc-800 z-10 shadow-xs backdrop-blur">
            <tr>
              {/* Select All Checkbox */}
              <th className="p-2.5 w-10 border-r border-slate-200 dark:border-zinc-800/80 text-center">
                <input
                  type="checkbox"
                  checked={records.length > 0 && selectedRowIds.size === records.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-red-500 focus:ring-0 cursor-pointer"
                />
              </th>

              {/* Index Column */}
              <th className="p-2.5 w-12 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-medium border-r border-slate-200 dark:border-zinc-800/80 text-center">
                #
              </th>

              {/* Data Columns */}
              {schema.columns.map((col) => {
                const isSorted = sortBy === col.name;
                return (
                  <th
                    key={col.name}
                    onClick={() => onSortChange(col.name)}
                    className="p-2.5 font-medium text-xs text-slate-700 dark:text-zinc-300 border-r border-slate-200 dark:border-zinc-800/80 cursor-pointer hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 transition group whitespace-nowrap"
                  >
                    <div className="flex items-center justify-between space-x-2">
                      <div className="flex items-center space-x-1.5">
                        {renderColumnIcon(col)}
                        <span className={col.primary ? 'font-semibold text-slate-900 dark:text-white' : ''}>
                          {col.name}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">
                          {col.type}
                        </span>
                      </div>

                      <div className="text-slate-400 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-300">
                        {isSorted ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp size={13} className="text-red-500" />
                          ) : (
                            <ArrowDown size={13} className="text-red-500" />
                          )
                        ) : (
                          <ArrowUpDown size={11} className="opacity-0 group-hover:opacity-100" />
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/40">
            {records.length === 0 ? (
              <tr>
                <td
                  colSpan={schema.columns.length + 2}
                  className="p-12 text-center text-slate-400 dark:text-zinc-500 font-mono text-xs"
                >
                  {loading ? 'Fetching records...' : 'No records found in table.'}
                </td>
              </tr>
            ) : (
              records.map((row, rowIdx) => {
                const rowId = getRowId(row);
                const isSelected = selectedRowIds.has(rowId);
                const isRowFocused = navActive && focusedRowIndex === rowIdx;

                return (
                  <tr
                    key={rowId ?? rowIdx}
                    data-row-focus={rowIdx}
                    onClick={() => setFocusedRowIndex(rowIdx)}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-slate-100/80 dark:bg-zinc-800/50'
                        : 'hover:bg-slate-50/80 dark:hover:bg-zinc-900/40'
                    } ${isRowFocused ? 'relative z-[1] shadow-[inset_0_0_0_1px_#94a3b8] dark:shadow-[inset_0_0_0_1px_#71717a]' : ''}`}
                  >
                    {/* Row Select */}
                    <td className="p-2.5 text-center border-r border-slate-100 dark:border-zinc-800/40">
                      <input
                        type="checkbox"
                        tabIndex={-1}
                        checked={isSelected}
                        onChange={() => handleToggleRow(rowId)}
                        className="rounded border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-red-500 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Row Index */}
                    <td className="p-2.5 text-center text-[10px] text-slate-400 dark:text-zinc-600 border-r border-slate-100 dark:border-zinc-800/40">
                      {(page - 1) * perPage + rowIdx + 1}
                    </td>

                    {/* Data Cells (Prisma Studio style inline editing) */}
                    {schema.columns.map((col) => {
                      const key = `${rowId}:${col.name}`;
                      const staged = stagedChanges.get(key);
                      const isStaged = Boolean(staged);
                      const displayVal = isStaged ? staged!.newValue : row[col.name];

                      const isEditing = editingCell?.rowId === rowId && editingCell?.column === col.name;
                      const isFocused = focusedCell?.rowId === rowId && focusedCell?.column === col.name;
                      const isAutoPk = col.primary && (col.type === 'integer' || col.name === 'id');

                      return (
                        <td
                          key={col.name}
                          tabIndex={isAutoPk ? -1 : 0}
                          onClick={() => setFocusedCell({ rowId, column: col.name })}
                          onDoubleClick={() => !isAutoPk && col.type !== 'boolean' && handleStartEdit(rowId, col.name, row[col.name])}
                          onKeyDown={(e) => !isEditing && handleCellKeyDown(e, rowId, col.name, row[col.name])}
                          className={`${
                            isEditing ? 'p-0 relative' : 'p-2.5'
                          } border-r border-slate-100 dark:border-zinc-800/40 whitespace-nowrap max-w-sm truncate relative group outline-none transition-all ${
                            isStaged
                              ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 ring-1 ring-inset ring-amber-400 dark:ring-amber-500/50'
                              : isFocused && !isEditing
                              ? 'ring-2 ring-inset ring-blue-500/80 bg-blue-50/20 dark:bg-blue-950/10'
                              : ''
                          } ${!isAutoPk ? 'cursor-cell' : 'cursor-default'}`}
                        >
                          {isEditing ? (
                            <div className="absolute inset-0 w-full h-full flex items-center z-20">
                              {col.foreign_key ? (
                                <div className="w-full h-full min-w-[200px]">
                                  <ForeignKeySelect
                                    targetTable={col.foreign_key.to_table}
                                    value={editValue}
                                    onChange={(newVal) => {
                                      setEditValue(newVal);
                                      const originalVal = row[col.name];
                                      onStageCellChange(rowId, col.name, originalVal, newVal);
                                      setEditingCell(null);
                                    }}
                                    isNullable={col.null}
                                    onCommit={() => handleCommitEdit()}
                                    onCancel={handleCancelEdit}
                                    inline
                                    autoFocus
                                  />
                                </div>
                              ) : col.enum_values && col.enum_values.length > 0 ? (
                                <select
                                  ref={inputEditRef as any}
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleCommitEdit()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCommitEdit();
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleCancelEdit();
                                    }
                                    if (e.key === 'Tab') {
                                      e.preventDefault();
                                      handleCommitEdit(e.shiftKey ? -1 : 1);
                                    }
                                  }}
                                  className="w-full h-full bg-white dark:bg-zinc-900 border-2 border-blue-500 dark:border-blue-400 px-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none font-mono shadow-xs"
                                >
                                  {col.null && <option value="">(null)</option>}
                                  {col.enum_values.map((v) => (
                                    <option key={v} value={v}>
                                      {v}
                                    </option>
                                  ))}
                                </select>
                              ) : col.type === 'datetime' || col.type === 'timestamp' ? (
                                <input
                                  ref={inputEditRef as any}
                                  type="datetime-local"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleCommitEdit()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCommitEdit();
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleCancelEdit();
                                    }
                                    if (e.key === 'Tab') {
                                      e.preventDefault();
                                      handleCommitEdit(e.shiftKey ? -1 : 1);
                                    }
                                  }}
                                  className="w-full h-full bg-white dark:bg-zinc-900 border-2 border-blue-500 dark:border-blue-400 px-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none font-mono shadow-xs"
                                />
                              ) : col.type === 'date' ? (
                                <input
                                  ref={inputEditRef as any}
                                  type="date"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleCommitEdit()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCommitEdit();
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleCancelEdit();
                                    }
                                    if (e.key === 'Tab') {
                                      e.preventDefault();
                                      handleCommitEdit(e.shiftKey ? -1 : 1);
                                    }
                                  }}
                                  className="w-full h-full bg-white dark:bg-zinc-900 border-2 border-blue-500 dark:border-blue-400 px-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none font-mono shadow-xs"
                                />
                              ) : col.type === 'time' ? (
                                <input
                                  ref={inputEditRef as any}
                                  type="time"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleCommitEdit()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCommitEdit();
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleCancelEdit();
                                    }
                                    if (e.key === 'Tab') {
                                      e.preventDefault();
                                      handleCommitEdit(e.shiftKey ? -1 : 1);
                                    }
                                  }}
                                  className="w-full h-full bg-white dark:bg-zinc-900 border-2 border-blue-500 dark:border-blue-400 px-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none font-mono shadow-xs"
                                />
                              ) : col.type === 'boolean' ? (
                                <BooleanToggle
                                  value={editValue}
                                  onChange={(next) => {
                                    setEditValue(String(next));
                                    onStageCellChange(rowId, col.name, row[col.name], next);
                                    setEditingCell(null);
                                  }}
                                />
                              ) : (
                                <input
                                  ref={inputEditRef as any}
                                  type={col.type === 'integer' || col.type === 'float' || col.type === 'decimal' ? 'number' : 'text'}
                                  step={col.type === 'integer' ? '1' : 'any'}
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleCommitEdit()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCommitEdit();
                                    if (e.key === 'Escape') {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleCancelEdit();
                                    }
                                    if (e.key === 'Tab') {
                                      e.preventDefault();
                                      handleCommitEdit(e.shiftKey ? -1 : 1);
                                    }
                                  }}
                                  className="w-full h-full bg-white dark:bg-zinc-900 border-2 border-blue-500 dark:border-blue-400 px-2.5 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none font-mono shadow-xs"
                                />
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-between space-x-2">
                              {col.type === 'boolean' ? (
                                <div className="flex items-center gap-2">
                                  <BooleanToggle
                                    value={displayVal}
                                    onChange={(next) => onStageCellChange(rowId, col.name, row[col.name], next)}
                                  />
                                  <span className={`text-[10px] font-mono ${
                                    coerceBoolean(displayVal) === true
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : displayVal === null || displayVal === undefined
                                      ? 'text-slate-400 dark:text-zinc-600 italic'
                                      : 'text-slate-400 dark:text-zinc-500'
                                  }`}>
                                    {displayVal === null || displayVal === undefined
                                      ? 'null'
                                      : coerceBoolean(displayVal) ? 'true' : 'false'}
                                  </span>
                                </div>
                              ) : col.foreign_key && displayVal !== null && displayVal !== undefined ? (
                                <div className="flex items-center space-x-1.5 truncate">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenForeignKey(col.foreign_key!.to_table, displayVal);
                                    }}
                                    className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:border-blue-800/60 dark:text-blue-300 dark:hover:bg-blue-900/60 transition text-xs"
                                  >
                                    <Link2 size={10} />
                                    <span>{col.foreign_key.to_table} #{String(displayVal)}</span>
                                    <span className="text-[10px] text-blue-500 dark:text-blue-400">↗</span>
                                  </button>
                                </div>
                              ) : displayVal === null || displayVal === undefined ? (
                                <span className="text-slate-400 dark:text-zinc-600 italic">null</span>
                              ) : typeof displayVal === 'object' ? (
                                <span className="text-slate-600 dark:text-zinc-400 truncate">
                                  {JSON.stringify(displayVal)}
                                </span>
                              ) : (
                                <span
                                  className={`truncate ${
                                    col.primary
                                      ? 'font-semibold text-slate-900 dark:text-zinc-100'
                                      : 'text-slate-800 dark:text-zinc-200'
                                  }`}
                                >
                                  {String(displayVal)}
                                </span>
                              )}

                              {/* Hover edit / expand icons */}
                              {!isAutoPk && col.type !== 'boolean' && (
                                <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 shrink-0">
                                  {(col.type === 'text' || col.type === 'json' || col.type === 'jsonb') && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenModalEditor(rowId, col.name, row[col.name], col.type);
                                      }}
                                      className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 transition"
                                      title="Edit in full dialog modal"
                                    >
                                      <Maximize2 size={11} />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartEdit(rowId, col.name, row[col.name]);
                                    }}
                                    className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 transition"
                                    title="Edit cell inline"
                                  >
                                    <Edit2 size={11} />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {isStaged && (
                            <span
                              className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"
                              title={`Original: ${row[col.name]}`}
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <footer className="h-9 px-3 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/40 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-zinc-400 shrink-0">
        <div className="flex items-center space-x-3">
          <span>
            {totalCount.toLocaleString()} {totalCount === 1 ? 'row' : 'rows'}
          </span>
          <span>•</span>
          <div className="flex items-center space-x-1.5">
            <span>Rows per page:</span>
            <select
              value={perPage}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-xs text-slate-700 dark:text-zinc-200 focus:outline-none shadow-xs"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </div>

        {/* Page Nav */}
        <div className="flex items-center space-x-2">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1 rounded bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-zinc-900 transition shadow-xs"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1 rounded bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-white dark:disabled:hover:bg-zinc-900 transition shadow-xs"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </footer>

      {/* Modal Dialog Editor for complex text / JSON */}
      {modalEditor && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            <div className="p-3.5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Edit2 size={14} className="text-blue-500" />
                <h3 className="font-semibold text-slate-900 dark:text-zinc-100 text-xs font-mono">
                  Edit <span className="text-red-500">{modalEditor.column}</span> ({modalEditor.type})
                </h3>
              </div>
              <button
                onClick={() => setModalEditor(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-4 flex flex-col space-y-2">
              <textarea
                autoFocus
                rows={8}
                value={modalEditor.value}
                onChange={(e) => setModalEditor({ ...modalEditor, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    e.currentTarget.blur();
                  }
                }}
                placeholder="Enter value..."
                className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-lg p-3 font-mono text-xs text-slate-900 dark:text-zinc-100 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
                <span>Length: {modalEditor.value.length} chars</span>
                {(modalEditor.type === 'json' || modalEditor.type === 'jsonb') && (
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(modalEditor.value);
                        setModalEditor({ ...modalEditor, value: JSON.stringify(parsed, null, 2) });
                      } catch {
                        // ignore formatting if invalid
                      }
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Format JSON
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-zinc-950/50 border-t border-slate-200 dark:border-zinc-800 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setModalEditor(null)}
                className="px-3 py-1.5 rounded text-xs text-slate-600 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-zinc-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModalEditor}
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition shadow-xs"
              >
                Apply Edit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
