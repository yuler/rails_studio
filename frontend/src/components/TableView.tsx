import React, { useState, useEffect } from 'react';
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
  Braces
} from 'lucide-react';
import { TableSchema, ColumnMeta, FilterCondition, StagedChange } from '../types';

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
  onDeleteSelectedRows: (rowIds: any[]) => void;
  onOpenForeignKey: (targetTable: string, targetId: any) => void;
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
  onOpenForeignKey
}) => {
  const [selectedRowIds, setSelectedRowIds] = useState<Set<any>>(new Set());
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [editingCell, setEditingCell] = useState<{ rowId: any; column: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Local draft filter for the filter bar
  const [draftFilters, setDraftFilters] = useState<FilterCondition[]>(filters);

  useEffect(() => {
    setDraftFilters(filters);
  }, [filters]);

  useEffect(() => {
    setSelectedRowIds(new Set());
    setEditingCell(null);
  }, [schema.table_name, page]);

  const primaryKeyCol = schema.primary_keys[0] || 'id';

  const getRowId = (record: Record<string, any>) => {
    if (schema.primary_keys.length > 1) {
      return schema.primary_keys.map((k) => record[k]).join(',');
    }
    return record[primaryKeyCol];
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

  const handleStartEdit = (rowId: any, column: string, currentVal: any) => {
    // Check if staged edit already exists
    const key = `${rowId}:${column}`;
    const staged = stagedChanges.get(key);
    const val = staged ? staged.newValue : currentVal;

    setEditingCell({ rowId, column });
    setEditValue(val === null || val === undefined ? '' : String(val));
  };

  const handleCommitEdit = () => {
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
      parsedVal = editValue === 'true';
    }

    onStageCellChange(rowId, column, originalVal, parsedVal);
    setEditingCell(null);
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
  };

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
    onFiltersChange(draftFilters.filter((f) => f.op === 'is_null' || f.op === 'is_not_null' || f.value.trim() !== ''));
  };

  const clearAllFilters = () => {
    setDraftFilters([]);
    onFiltersChange([]);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));

  const renderColumnIcon = (col: ColumnMeta) => {
    if (col.primary) return <Key size={12} className="text-amber-400 shrink-0" />;
    if (col.foreign_key) return <Link2 size={12} className="text-blue-400 shrink-0" />;
    switch (col.type) {
      case 'integer':
      case 'float':
      case 'decimal':
        return <Hash size={12} className="text-emerald-400 shrink-0" />;
      case 'boolean':
        return <ToggleLeft size={12} className="text-purple-400 shrink-0" />;
      case 'datetime':
      case 'date':
      case 'time':
        return <Calendar size={12} className="text-orange-400 shrink-0" />;
      case 'json':
      case 'jsonb':
        return <Braces size={12} className="text-sky-400 shrink-0" />;
      default:
        return <Type size={12} className="text-zinc-400 shrink-0" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-zinc-950 select-none">
      {/* Action Bar */}
      <div className="p-3 border-b border-zinc-800 bg-zinc-900/30 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilterBar(!showFilterBar)}
            className={`px-2.5 py-1.5 rounded-md flex items-center space-x-1.5 transition border ${
              filters.length > 0 || showFilterBar
                ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Filter size={13} />
            <span>Filter</span>
            {filters.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-500/20 text-red-400 text-[10px] flex items-center justify-center font-mono">
                {filters.length}
              </span>
            )}
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
            title="Refresh records"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {selectedRowIds.size > 0 && (
            <button
              onClick={() => onDeleteSelectedRows(Array.from(selectedRowIds))}
              className="px-3 py-1.5 rounded-md bg-red-950/80 border border-red-800 text-red-300 hover:bg-red-900/80 transition flex items-center space-x-1.5"
            >
              <Trash2 size={13} />
              <span>Delete ({selectedRowIds.size})</span>
            </button>
          )}

          <button
            onClick={onOpenInsertModal}
            className="px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-900 font-medium transition flex items-center space-x-1.5 shadow-sm"
          >
            <Plus size={14} />
            <span>Add Row</span>
          </button>
        </div>
      </div>

      {/* Filter Bar Panel */}
      {showFilterBar && (
        <div className="p-3 border-b border-zinc-800 bg-zinc-900/60 flex flex-col space-y-2 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-zinc-500">
              Filter Conditions
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={clearAllFilters}
                className="text-[11px] text-zinc-500 hover:text-zinc-300"
              >
                Reset
              </button>
              <button
                onClick={applyFilters}
                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition border border-zinc-700"
              >
                Apply
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {draftFilters.map((f) => (
              <div key={f.id} className="flex items-center space-x-2 text-xs">
                {/* Column */}
                <select
                  value={f.column}
                  onChange={(e) => {
                    const next = draftFilters.map((df) =>
                      df.id === f.id ? { ...df, column: e.target.value } : df
                    );
                    setDraftFilters(next);
                  }}
                  className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono text-xs focus:outline-none"
                >
                  {schema.columns.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Operator */}
                <select
                  value={f.op}
                  onChange={(e) => {
                    const next = draftFilters.map((df) =>
                      df.id === f.id ? { ...df, op: e.target.value as any } : df
                    );
                    setDraftFilters(next);
                  }}
                  className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono text-xs focus:outline-none"
                >
                  <option value="contains">contains</option>
                  <option value="eq">equals</option>
                  <option value="not_eq">not equals</option>
                  <option value="starts_with">starts with</option>
                  <option value="ends_with">ends with</option>
                  <option value="gt">&gt;</option>
                  <option value="gte">&gt;=</option>
                  <option value="lt">&lt;</option>
                  <option value="lte">&lt;=</option>
                  <option value="is_null">is null</option>
                  <option value="is_not_null">is not null</option>
                </select>

                {/* Value */}
                {f.op !== 'is_null' && f.op !== 'is_not_null' && (
                  <input
                    type="text"
                    placeholder="Value..."
                    value={f.value}
                    onChange={(e) => {
                      const next = draftFilters.map((df) =>
                        df.id === f.id ? { ...df, value: e.target.value } : df
                      );
                      setDraftFilters(next);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-zinc-200 font-mono text-xs focus:outline-none focus:border-zinc-700"
                  />
                )}

                <button
                  onClick={() => removeDraftFilter(f.id)}
                  className="p-1 text-zinc-500 hover:text-zinc-300"
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            <button
              onClick={addDraftFilter}
              className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center space-x-1 pt-1"
            >
              <Plus size={13} />
              <span>Add condition</span>
            </button>
          </div>
        </div>
      )}

      {/* Spreadsheet Table Container */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full text-left font-mono text-xs border-collapse">
          {/* Table Header */}
          <thead className="bg-zinc-900 sticky top-0 border-b border-zinc-800 z-10 shadow-sm">
            <tr>
              {/* Select All Checkbox */}
              <th className="p-2.5 w-10 border-r border-zinc-800/80 text-center">
                <input
                  type="checkbox"
                  checked={records.length > 0 && selectedRowIds.size === records.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-950 text-red-500 focus:ring-0 cursor-pointer"
                />
              </th>

              {/* Index Column */}
              <th className="p-2.5 w-12 text-zinc-500 text-[10px] uppercase font-medium border-r border-zinc-800/80 text-center">
                #
              </th>

              {/* Data Columns */}
              {schema.columns.map((col) => {
                const isSorted = sortBy === col.name;
                return (
                  <th
                    key={col.name}
                    onClick={() => onSortChange(col.name)}
                    className="p-2.5 font-medium text-xs text-zinc-300 border-r border-zinc-800/80 cursor-pointer hover:bg-zinc-800/60 transition group whitespace-nowrap"
                  >
                    <div className="flex items-center justify-between space-x-2">
                      <div className="flex items-center space-x-1.5">
                        {renderColumnIcon(col)}
                        <span className={col.primary ? 'font-semibold text-white' : ''}>
                          {col.name}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-normal">
                          {col.type}
                        </span>
                      </div>

                      <div className="text-zinc-500 group-hover:text-zinc-300">
                        {isSorted ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp size={13} className="text-red-400" />
                          ) : (
                            <ArrowDown size={13} className="text-red-400" />
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
          <tbody className="divide-y divide-zinc-800/40">
            {records.length === 0 ? (
              <tr>
                <td
                  colSpan={schema.columns.length + 2}
                  className="p-12 text-center text-zinc-500 font-mono text-xs"
                >
                  {loading ? 'Fetching records...' : 'No records found in table.'}
                </td>
              </tr>
            ) : (
              records.map((row, rowIdx) => {
                const rowId = getRowId(row);
                const isSelected = selectedRowIds.has(rowId);

                return (
                  <tr
                    key={rowId ?? rowIdx}
                    className={`transition-colors ${
                      isSelected ? 'bg-zinc-800/50' : 'hover:bg-zinc-900/40'
                    }`}
                  >
                    {/* Row Select */}
                    <td className="p-2.5 text-center border-r border-zinc-800/40">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleRow(rowId)}
                        className="rounded border-zinc-700 bg-zinc-950 text-red-500 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Row Index */}
                    <td className="p-2.5 text-center text-[10px] text-zinc-600 border-r border-zinc-800/40">
                      {(page - 1) * perPage + rowIdx + 1}
                    </td>

                    {/* Data Cells */}
                    {schema.columns.map((col) => {
                      const key = `${rowId}:${col.name}`;
                      const staged = stagedChanges.get(key);
                      const isStaged = Boolean(staged);
                      const displayVal = isStaged ? staged!.newValue : row[col.name];

                      const isEditing =
                        editingCell?.rowId === rowId && editingCell?.column === col.name;

                      return (
                        <td
                          key={col.name}
                          onDoubleClick={() => !col.primary && handleStartEdit(rowId, col.name, row[col.name])}
                          className={`p-2.5 border-r border-zinc-800/40 whitespace-nowrap max-w-sm truncate relative ${
                            isStaged ? 'bg-amber-950/20 text-amber-200 ring-1 ring-inset ring-amber-500/50' : ''
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex items-center space-x-1 -m-1">
                              {col.enum_values && col.enum_values.length > 0 ? (
                                <select
                                  autoFocus
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleCommitEdit}
                                  className="w-full bg-zinc-950 border border-zinc-600 rounded px-1.5 py-0.5 text-xs text-zinc-100 focus:outline-none"
                                >
                                  {col.null && <option value="">(null)</option>}
                                  {col.enum_values.map((v) => (
                                    <option key={v} value={v}>
                                      {v}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  autoFocus
                                  type={col.type === 'integer' || col.type === 'float' ? 'number' : 'text'}
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={handleCommitEdit}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCommitEdit();
                                    if (e.key === 'Escape') handleCancelEdit();
                                  }}
                                  className="w-full bg-zinc-950 border border-zinc-600 rounded px-1.5 py-0.5 text-xs text-zinc-100 focus:outline-none"
                                />
                              )}
                            </div>
                          ) : col.foreign_key && displayVal !== null && displayVal !== undefined ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenForeignKey(col.foreign_key!.to_table, displayVal);
                              }}
                              className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-800/60 text-blue-300 hover:bg-blue-900/60 transition text-xs"
                            >
                              <Link2 size={10} />
                              <span>{col.foreign_key.to_table} #{String(displayVal)}</span>
                              <span className="text-[10px] text-blue-400">↗</span>
                            </button>
                          ) : displayVal === null || displayVal === undefined ? (
                            <span className="text-zinc-600 italic">null</span>
                          ) : typeof displayVal === 'boolean' ? (
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                displayVal ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'
                              }`}
                            >
                              {displayVal ? 'true' : 'false'}
                            </span>
                          ) : typeof displayVal === 'object' ? (
                            <span className="text-zinc-400">
                              {JSON.stringify(displayVal)}
                            </span>
                          ) : (
                            <span className={col.primary ? 'font-semibold text-zinc-100' : 'text-zinc-200'}>
                              {String(displayVal)}
                            </span>
                          )}

                          {isStaged && (
                            <span
                              className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400"
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
      <footer className="p-3 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between text-xs font-mono text-zinc-400">
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
              className="bg-zinc-950 border border-zinc-800 rounded px-1.5 py-0.5 text-xs text-zinc-200 focus:outline-none"
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
              className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900 transition"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:hover:bg-zinc-900 transition"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
