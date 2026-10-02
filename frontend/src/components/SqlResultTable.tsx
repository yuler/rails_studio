import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Check, Copy, Edit2, FileJson, Link2, Save, Trash2, Undo2 } from 'lucide-react';
import { getConfig, saveBatch } from '../api';
import { ColumnMeta, StagedChange, TableSchema } from '../types';
import { BooleanToggle, coerceBoolean } from './BooleanToggle';
import { ContextMenu, ContextMenuItem, copyToClipboard } from './ContextMenu';
import { ForeignKeySelect } from './ForeignKeySelect';
import { formatForDate, formatForDateTimeLocal, formatForTime } from './TableView';
import { chordMatches, shortcutLabel } from '../shortcuts';
import { isOverlayOpen, useShortcut } from '../useShortcut';
import { ShortcutKeys } from './ShortcutKeys';

interface SqlResultTableProps {
  columns: string[];
  rows: any[][];
  tableName?: string | null;
  primaryKeys?: string[];
  schema: TableSchema | null;
  filter: string;
  navActive?: boolean;
  onActivate?: () => void;
  onSelectedChange?: (count: number) => void;
  onRowsChange: (rows: any[][]) => void;
  onOpenForeignKey?: (targetTable: string, targetId: any) => void;
}

export interface SqlResultTableHandle {
  deleteSelected: () => Promise<void>;
}

function toRecord(columns: string[], row: any[]): Record<string, any> {
  const rec: Record<string, any> = {};
  columns.forEach((col, i) => {
    rec[col] = row[i];
  });
  return rec;
}

function rowIdOf(columns: string[], row: any[], primaryKeys: string[]): string {
  const rec = toRecord(columns, row);
  return primaryKeys.map((k) => String(rec[k])).join(',');
}

export const SqlResultTable = forwardRef<SqlResultTableHandle, SqlResultTableProps>(function SqlResultTable(
  {
    columns,
    rows,
    tableName,
    primaryKeys = [],
    schema,
    filter,
    navActive = false,
    onActivate,
    onSelectedChange,
    onRowsChange,
    onOpenForeignKey
  },
  ref
) {
  const readOnly = Boolean(getConfig().readOnly);
  const editable =
    !readOnly &&
    Boolean(tableName) &&
    primaryKeys.length > 0 &&
    primaryKeys.every((pk) => columns.includes(pk));

  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [stagedChanges, setStagedChanges] = useState<Map<string, StagedChange>>(new Map());
  const [editingCell, setEditingCell] = useState<{ rowId: string; column: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [focusedRowIndex, setFocusedRowIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);
  const editInitialRef = useRef('');
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    row: any[];
    rowId: string;
    column?: string;
  } | null>(null);

  useEffect(() => {
    setSelectedRowIds(new Set());
    setStagedChanges(new Map());
    setEditingCell(null);
    setFocusedRowIndex(0);
  }, [tableName, columns.join('|')]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement && ['text', 'number'].includes(inputRef.current.type)) inputRef.current.select();
    }
  }, [editingCell?.rowId, editingCell?.column]);

  const columnMeta = (name: string): ColumnMeta | undefined =>
    schema?.columns.find((c) => c.name === name);

  const filteredRows = useMemo(() => {
    if (!filter.trim()) return rows;
    const q = filter.toLowerCase();
    return rows.filter((row) =>
      row.some((cell) => cell !== null && cell !== undefined && String(cell).toLowerCase().includes(q))
    );
  }, [rows, filter]);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 2500);
  };

  const stageChange = (rowId: string, column: string, originalValue: any, newValue: any) => {
    setStagedChanges((prev) => {
      const next = new Map(prev);
      const key = `${rowId}:${column}`;
      if (Object.is(originalValue, newValue) || String(originalValue) === String(newValue)) {
        next.delete(key);
      } else {
        next.set(key, { rowId, column, originalValue, newValue });
      }
      return next;
    });
  };

  const applyStagedToRows = (nextStaged: Map<string, StagedChange>, nextRows = rows) => {
    return nextRows.map((row) => {
      const id = rowIdOf(columns, row, primaryKeys);
      return columns.map((col, i) => {
        const staged = nextStaged.get(`${id}:${col}`);
        return staged ? staged.newValue : row[i];
      });
    });
  };

  const handleStartEdit = (rowId: string, column: string, originalVal: any) => {
    if (!editable) return;
    const meta = columnMeta(column);
    if (meta?.primary && (meta.type === 'integer' || meta.name === 'id')) return;
    if (primaryKeys.includes(column) && (meta?.type === 'integer' || column === 'id')) return;

    const staged = stagedChanges.get(`${rowId}:${column}`);
    const current = staged ? staged.newValue : originalVal;

    if (meta?.type === 'boolean') {
      stageChange(rowId, column, originalVal, coerceBoolean(current) !== true);
      return;
    }

    let initial = current === null || current === undefined ? '' : String(current);
    if (meta?.type === 'datetime' || meta?.type === 'timestamp') initial = formatForDateTimeLocal(current);
    else if (meta?.type === 'date') initial = formatForDate(current);
    else if (meta?.type === 'time') initial = formatForTime(current);

    setEditingCell({ rowId, column });
    setEditValue(initial);
    editInitialRef.current = initial;
  };

  const handleCommitEdit = () => {
    if (!editingCell) return;
    const { rowId, column } = editingCell;
    const row = rows.find((r) => rowIdOf(columns, r, primaryKeys) === rowId);
    if (!row || editValue === editInitialRef.current) {
      setEditingCell(null);
      return;
    }
    const originalVal = row[columns.indexOf(column)];
    const meta = columnMeta(column);
    let parsed: any = editValue;
    if (editValue === '' && meta?.null && meta.type !== 'string' && meta.type !== 'text') {
      parsed = null;
    } else if (meta?.type === 'integer') {
      parsed = editValue === '' ? null : parseInt(editValue, 10);
    } else if (meta?.type === 'float' || meta?.type === 'decimal') {
      parsed = editValue === '' ? null : parseFloat(editValue);
    }
    stageChange(rowId, column, originalVal, parsed);
    setEditingCell(null);
  };

  const toggleRow = (rowId: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const toggleAll = () => {
    const ids = filteredRows.map((row, i) => rowIdOfRow(row, i));
    const allSelected = ids.length > 0 && ids.every((id) => selectedRowIds.has(id));
    setSelectedRowIds(allSelected ? new Set() : new Set(ids));
  };

  useEffect(() => {
    if (focusedRowIndex >= filteredRows.length) {
      setFocusedRowIndex(Math.max(0, filteredRows.length - 1));
    }
  }, [filteredRows.length, focusedRowIndex]);

  useEffect(() => {
    if (!navActive) return;
    const el = document.querySelector('[data-sql-row-focus="true"]');
    if (el) (el as HTMLElement).scrollIntoView({ block: 'nearest' });
  }, [focusedRowIndex, navActive]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || tag === 'select' || Boolean(target?.isContentEditable);
      if (isTyping || editingCell || isOverlayOpen()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (!navActive) return;
      if (filteredRows.length === 0) return;
      if (chordMatches(e, { code: 'ArrowDown' })) {
        e.preventDefault();
        setFocusedRowIndex((i) => Math.min(filteredRows.length - 1, i + 1));
        return;
      }
      if (chordMatches(e, { code: 'ArrowUp' })) {
        e.preventDefault();
        setFocusedRowIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (chordMatches(e, { code: 'Space' })) {
        e.preventDefault();
        const row = filteredRows[focusedRowIndex];
        if (row) toggleRow(rowIdOfRow(row, focusedRowIndex));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navActive, filteredRows, focusedRowIndex, editingCell, selectedRowIds, editable, columns, primaryKeys]);

  const handleDelete = async (ids: Set<string> = selectedRowIds) => {
    if (!editable || !tableName || ids.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${ids.size} records? This action cannot be undone.`)) {
      return;
    }
    try {
      await saveBatch(tableName, { deletes: Array.from(ids) });
      const remaining = rows.filter((row) => !ids.has(rowIdOf(columns, row, primaryKeys)));
      onRowsChange(remaining);
      setSelectedRowIds(new Set());
      setStagedChanges((prev) => {
        const next = new Map(prev);
        Array.from(next.keys()).forEach((key) => {
          const id = key.slice(0, key.lastIndexOf(':'));
          if (ids.has(id)) next.delete(key);
        });
        return next;
      });
      showNotice(`Deleted ${ids.size} records`);
    } catch (err: any) {
      showNotice(err.message || 'Failed to delete records');
    }
  };

  const rowIdOfRow = (row: any[], rowIdx: number) =>
    editable ? rowIdOf(columns, row, primaryKeys) : String(rowIdx);

  useEffect(() => {
    onSelectedChange?.(editable ? selectedRowIds.size : 0);
  }, [selectedRowIds, onSelectedChange, editable]);

  useImperativeHandle(ref, () => ({
    deleteSelected: () => handleDelete()
  }));

  const handleRowContextMenu = (e: React.MouseEvent, row: any[], rowIdx: number, column?: string) => {
    e.preventDefault();
    e.stopPropagation();
    onActivate?.();
    setFocusedRowIndex(rowIdx);
    const rowId = rowIdOfRow(row, rowIdx);
    if (!selectedRowIds.has(rowId)) setSelectedRowIds(new Set([rowId]));
    setContextMenu({ x: e.clientX, y: e.clientY, row, rowId, column });
  };

  const contextMenuItems: ContextMenuItem[] = contextMenu
    ? (() => {
        const { row, rowId, column } = contextMenu;
        const cellIdx = column ? columns.indexOf(column) : -1;
        const valueOf = (col: string, idx: number) => {
          const staged = stagedChanges.get(`${rowId}:${col}`);
          return staged ? staged.newValue : row[idx];
        };
        const meta = column ? columnMeta(column) : undefined;
        const cellVal = column ? valueOf(column, cellIdx) : undefined;
        const isAutoPk = Boolean(column && primaryKeys.includes(column) && (meta?.type === 'integer' || column === 'id'));
        const canEdit = editable && Boolean(column) && !isAutoPk;
        const targetIds = selectedRowIds.has(rowId) ? new Set(selectedRowIds) : new Set([rowId]);

        const items: ContextMenuItem[] = [
          {
            id: 'edit-cell',
            label: 'Edit Cell',
            icon: <Edit2 size={13} />,
            shortcut: '↵',
            disabled: !canEdit,
            onClick: () => {
              if (column && canEdit) handleStartEdit(rowId, column, row[cellIdx]);
            }
          },
          {
            id: 'copy-cell',
            label: 'Copy Cell Value',
            icon: <Copy size={13} />,
            disabled: !column,
            onClick: async () => {
              const ok = await copyToClipboard(cellVal === null || cellVal === undefined ? '' : String(cellVal));
              if (ok) showNotice('Copied cell value to clipboard');
            }
          },
          {
            id: 'copy-row-json',
            label: 'Copy Row as JSON',
            icon: <FileJson size={13} />,
            onClick: async () => {
              const rowObj: Record<string, any> = {};
              columns.forEach((c, i) => {
                rowObj[c] = valueOf(c, i);
              });
              const ok = await copyToClipboard(JSON.stringify(rowObj, null, 2));
              if (ok) showNotice('Copied row as JSON to clipboard');
            }
          }
        ];

        if (meta?.foreign_key && cellVal !== null && cellVal !== undefined && cellVal !== '') {
          const targetTable = meta.foreign_key.to_table;
          items.push({
            id: 'go-foreign-key',
            label: `Go to ${targetTable} (${cellVal})`,
            icon: <Link2 size={13} />,
            onClick: () => onOpenForeignKey?.(targetTable, cellVal)
          });
        }

        if (editable) {
          items.push(
            { separator: true },
            {
              id: 'delete-rows',
              label: targetIds.size > 1 ? `Delete ${targetIds.size} Rows` : 'Delete Row',
              icon: <Trash2 size={13} />,
              shortcut: shortcutLabel('deleteResultRows'),
              danger: true,
              onClick: () => void handleDelete(targetIds)
            }
          );
        }

        return items;
      })()
    : [];

  const handleSave = async () => {
    if (!editable || !tableName || stagedChanges.size === 0) return;
    setSaving(true);
    try {
      const updatesMap = new Map<any, Record<string, any>>();
      stagedChanges.forEach(({ rowId, column, newValue }) => {
        const changes = updatesMap.get(rowId) || {};
        changes[column] = newValue;
        updatesMap.set(rowId, changes);
      });
      const updatesList = Array.from(updatesMap.entries()).map(([id, changes]) => ({ id, changes }));
      await saveBatch(tableName, { updates: updatesList });
      onRowsChange(applyStagedToRows(stagedChanges));
      setStagedChanges(new Map());
      showNotice(`Saved ${updatesList.length} row${updatesList.length === 1 ? '' : 's'}`);
    } catch (err: any) {
      showNotice(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const inResults = (event: KeyboardEvent) =>
    event.target instanceof Element && Boolean(event.target.closest('[data-sql-results]'));

  useShortcut('deleteResultRows', () => void handleDelete(), Boolean(editable && navActive && selectedRowIds.size > 0));
  useShortcut('saveResultEdits', () => {
    if (stagedChanges.size > 0 && !saving) void handleSave();
  }, { accept: inResults });
  useShortcut('discardResultEdits', () => setStagedChanges(new Map()), {
    enabled: stagedChanges.size > 0,
    accept: inResults
  });

  const renderCell = (row: any[], rowId: string, col: string, cellIdx: number, displayOnly = false) => {
    const originalVal = row[cellIdx];
    const staged = stagedChanges.get(`${rowId}:${col}`);
    const displayVal = staged ? staged.newValue : originalVal;
    const meta = columnMeta(col);
    const isEditing = !displayOnly && editingCell?.rowId === rowId && editingCell?.column === col;
    const isPk = primaryKeys.includes(col);
    const isAutoPk = isPk && (meta?.type === 'integer' || col === 'id');

    const editorClass =
      'w-full h-full bg-white dark:bg-zinc-900 border-2 border-blue-500 dark:border-blue-400 px-2 text-xs text-slate-900 dark:text-zinc-100 focus:outline-none font-mono shadow-xs';
    const editorKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCommitEdit();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setEditingCell(null);
      }
    };

    if (isEditing && meta?.foreign_key) {
      return (
        <div className="absolute inset-0 w-full h-full flex items-center z-20">
          <div className="w-full h-full min-w-[200px]">
          <ForeignKeySelect
            targetTable={meta.foreign_key.to_table}
            value={editValue}
            onChange={(next) => {
              const parsed =
                meta.type === 'integer' && next !== null && next !== '' ? parseInt(String(next), 10) : next;
              setEditValue(next === null || next === undefined ? '' : String(next));
              stageChange(rowId, col, originalVal, parsed === '' ? null : parsed);
            }}
            isNullable={meta.null}
            onCommit={() => setEditingCell(null)}
            onCancel={() => setEditingCell(null)}
            inline
            autoFocus
          />
          </div>
        </div>
      );
    }

    if (isEditing) {
      const type = meta?.type;
      return (
        <div className="absolute inset-0 w-full h-full flex items-center z-20">
          {meta?.enum_values && meta.enum_values.length > 0 ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleCommitEdit}
              onKeyDown={editorKeyDown}
              className={editorClass}
            >
              {meta.null && <option value="">(null)</option>}
              {meta.enum_values.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={
                type === 'datetime' || type === 'timestamp'
                  ? 'datetime-local'
                  : type === 'date'
                  ? 'date'
                  : type === 'time'
                  ? 'time'
                  : type === 'integer' || type === 'float' || type === 'decimal'
                  ? 'number'
                  : 'text'
              }
              step={type === 'integer' ? '1' : type === 'float' || type === 'decimal' ? 'any' : undefined}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleCommitEdit}
              onKeyDown={editorKeyDown}
              className={editorClass}
            />
          )}
        </div>
      );
    }

    if (editable && meta?.type === 'boolean') {
      return (
        <BooleanToggle
          value={displayVal}
          onChange={(next) => stageChange(rowId, col, originalVal, next)}
        />
      );
    }

    if (displayVal === null || displayVal === undefined) {
      return <span className="text-slate-400 dark:text-zinc-600 italic">null</span>;
    }

    if (meta?.foreign_key) {
      const targetTable = meta.foreign_key.to_table;
      return (
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            onOpenForeignKey?.(targetTable, displayVal);
          }}
          className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:border-blue-800/60 dark:text-blue-300 dark:hover:bg-blue-900/60 transition text-xs"
        >
          <Link2 size={10} />
          <span>{targetTable} #{String(displayVal)}</span>
          <span className="text-[10px] text-blue-500 dark:text-blue-400">↗</span>
        </button>
      );
    }

    if (typeof displayVal === 'boolean' || meta?.type === 'boolean') {
      return (
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
            coerceBoolean(displayVal)
              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
          }`}
        >
          {String(coerceBoolean(displayVal) === true)}
        </span>
      );
    }

    return String(displayVal);
  };

  const allFilteredSelected =
    filteredRows.length > 0 &&
    filteredRows.every((row, i) => selectedRowIds.has(rowIdOfRow(row, i)));

  return (
    <div className="relative min-h-full">
      {editable && stagedChanges.size > 0 && (
        <div className="sticky top-0 z-20 px-3 py-1.5 bg-slate-50/95 dark:bg-zinc-900/95 border-b border-slate-200 dark:border-zinc-800 flex items-center gap-2 text-xs font-mono backdrop-blur">
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setStagedChanges(new Map())}
            title={`Discard (${shortcutLabel('discardResultEdits')})`}
            className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 flex items-center gap-1.5"
          >
            <Undo2 size={12} />
            Discard
            <ShortcutKeys id="discardResultEdits" className="px-1 py-0.5 text-[9px] font-mono rounded border border-slate-200 dark:border-zinc-700" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            onClick={() => void handleSave()}
            disabled={saving}
            title={`Save (${shortcutLabel('saveResultEdits')})`}
            className="px-2.5 py-1 rounded-md bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? <Save size={12} className="animate-pulse" /> : <Check size={12} />}
            Save ({stagedChanges.size})
            <ShortcutKeys id="saveResultEdits" className="px-1 py-0.5 text-[9px] font-mono rounded bg-white/20" />
          </button>
          {notice && <span className="ml-auto text-[11px] text-slate-500 dark:text-zinc-400">{notice}</span>}
        </div>
      )}

      {notice && stagedChanges.size === 0 && (
        <div className="px-3 py-1 text-[11px] font-mono text-slate-500 dark:text-zinc-400">{notice}</div>
      )}

      <table className="w-full text-left font-mono text-xs border-separate border-spacing-0">
        <thead className="bg-slate-100/90 dark:bg-zinc-900 sticky top-0 border-b border-slate-200 dark:border-zinc-800 z-10 backdrop-blur shadow-xs">
          <tr>
            <th className="p-2.5 w-10 text-center border-r border-b border-slate-200 dark:border-zinc-800/80">
              <input
                type="checkbox"
                tabIndex={-1}
                checked={allFilteredSelected}
                onChange={toggleAll}
                className="rounded border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-red-500 focus:ring-0 cursor-pointer"
              />
            </th>
            <th className="p-2.5 w-12 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-medium border-r border-b border-slate-200 dark:border-zinc-800/80 text-center">
              #
            </th>
            {columns.map((col) => (
              <th
                key={col}
                className="p-2.5 text-slate-700 dark:text-zinc-300 font-medium text-xs border-r border-b border-slate-200 dark:border-zinc-800/80 whitespace-nowrap"
              >
                <span className="inline-flex items-center gap-1.5">
                  {columnMeta(col)?.foreign_key && (
                    <Link2 size={12} className="text-blue-500 dark:text-blue-400 shrink-0" />
                  )}
                  {col}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row, rowIdx) => {
            const rowId = rowIdOfRow(row, rowIdx);
            const isSelected = selectedRowIds.has(rowId);
            const isRowFocused = navActive && focusedRowIndex === rowIdx;
            return (
              <tr
                key={`${rowId}-${rowIdx}`}
                data-sql-row-focus={isRowFocused ? 'true' : undefined}
                onContextMenu={(e) => handleRowContextMenu(e, row, rowIdx)}
                onClick={() => {
                  setFocusedRowIndex(rowIdx);
                  onActivate?.();
                }}
                className={`transition-colors ${
                  isSelected ? 'bg-slate-100/80 dark:bg-zinc-800/50' : 'hover:bg-slate-50 dark:hover:bg-zinc-900/50'
                } ${isRowFocused ? 'relative z-[1] shadow-[inset_0_0_0_1px_#94a3b8] dark:shadow-[inset_0_0_0_1px_#71717a]' : ''}`}
              >
                <td className="p-2.5 text-center border-r border-slate-100 dark:border-zinc-800/40">
                  <input
                    type="checkbox"
                    tabIndex={-1}
                    checked={isSelected}
                    onChange={() => toggleRow(rowId)}
                    className="rounded border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-red-500 focus:ring-0 cursor-pointer"
                  />
                </td>
                <td className="p-2.5 text-slate-400 dark:text-zinc-600 text-center text-[10px] border-r border-slate-100 dark:border-zinc-800/40">
                  {rowIdx + 1}
                </td>
                {row.map((cell, cellIdx) => {
                  const col = columns[cellIdx];
                  const staged = stagedChanges.get(`${rowId}:${col}`);
                  const meta = columnMeta(col);
                  const isAutoPk =
                    primaryKeys.includes(col) && (meta?.type === 'integer' || col === 'id');
                  const isEditing = editingCell?.rowId === rowId && editingCell?.column === col;
                  return (
                    <td
                      key={col}
                      onDoubleClick={() => !isAutoPk && !isEditing && handleStartEdit(rowId, col, cell)}
                      onContextMenu={(e) => !isEditing && handleRowContextMenu(e, row, rowIdx, col)}
                      className={`relative p-2.5 text-slate-800 dark:text-zinc-200 border-r border-slate-100 dark:border-zinc-800/40 whitespace-nowrap max-w-sm truncate ${
                        editable && !isAutoPk ? 'cursor-cell' : 'select-text'
                      } ${staged ? 'bg-amber-50 dark:bg-amber-950/20 ring-1 ring-inset ring-amber-400' : ''}`}
                    >
                      {isEditing && (
                        <span className="invisible" aria-hidden>
                          {renderCell(row, rowId, col, cellIdx, true)}
                        </span>
                      )}
                      {renderCell(row, rowId, col, cellIdx)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
          {filteredRows.length === 0 && filter && (
            <tr>
              <td
                colSpan={columns.length + 2}
                className="p-8 text-center text-slate-400 dark:text-zinc-500 font-mono"
              >
                No rows match filter "{filter}"
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
});
