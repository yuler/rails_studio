import React, { useState } from 'react';
import { Table, Search, Key, Link2, Layers } from 'lucide-react';
import { TableMeta } from '../types';

interface SidebarProps {
  tables: TableMeta[];
  selectedTable: string | null;
  onSelectTable: (name: string) => void;
  loading: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tables,
  selectedTable,
  onSelectTable,
  loading
}) => {
  const [search, setSearch] = useState('');

  const filteredTables = tables.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalRows = tables.reduce((sum, t) => sum + (t.row_count || 0), 0);

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-900/60 flex flex-col h-[calc(100vh-3.5rem)] select-none">
      {/* Search Tables Input */}
      <div className="p-3 border-b border-zinc-800">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Filter tables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
          />
        </div>
      </div>

      {/* Tables List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
          <span>Tables ({filteredTables.length})</span>
          <span className="text-[10px] text-zinc-600 font-mono">
            {totalRows.toLocaleString()} rows
          </span>
        </div>

        {loading && tables.length === 0 ? (
          <div className="p-4 text-center text-xs text-zinc-500 font-mono">
            Loading tables...
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="p-4 text-center text-xs text-zinc-500 font-mono">
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
                    ? 'bg-zinc-800 text-white font-medium shadow-sm border border-zinc-700/60'
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <Table
                    size={14}
                    className={`${
                      isSelected ? 'text-red-400' : 'text-zinc-500 group-hover:text-zinc-400'
                    }`}
                  />
                  <span className="truncate">{tbl.name}</span>
                </div>

                <div className="flex items-center space-x-1 pl-2">
                  {tbl.foreign_keys_count > 0 && (
                    <Link2 size={11} className="text-zinc-600" title={`${tbl.foreign_keys_count} foreign keys`} />
                  )}
                  {tbl.primary_keys.length > 0 && (
                    <Key size={11} className="text-zinc-600" title={`Primary key: ${tbl.primary_keys.join(', ')}`} />
                  )}
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-zinc-700/80 text-zinc-200'
                        : 'bg-zinc-950 text-zinc-500 group-hover:text-zinc-400'
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
      <div className="p-3 border-t border-zinc-800 bg-zinc-950/40 text-[11px] text-zinc-500 flex items-center justify-between font-mono">
        <div className="flex items-center space-x-1.5">
          <Layers size={13} className="text-zinc-500" />
          <span>{tables.length} schemas loaded</span>
        </div>
      </div>
    </aside>
  );
};
