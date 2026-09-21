import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Key, Link2, Copy, Check } from 'lucide-react';
import { fetchRecordById, fetchTableSchema } from '../api';
import { TableSchema } from '../types';

interface ForeignKeyDrawerProps {
  targetTable: string;
  targetId: any;
  onClose: () => void;
  onNavigateToTable: (tableName: string) => void;
  onSelectNestedFk: (table: string, id: any) => void;
}

export const ForeignKeyDrawer: React.FC<ForeignKeyDrawerProps> = ({
  targetTable,
  targetId,
  onClose,
  onNavigateToTable,
  onSelectNestedFk
}) => {
  const [record, setRecord] = useState<Record<string, any> | null>(null);
  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const [recRes, schemaRes] = await Promise.all([
          fetchRecordById(targetTable, targetId),
          fetchTableSchema(targetTable)
        ]);

        if (!cancelled) {
          setRecord(recRes.record);
          setSchema(schemaRes);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Failed to load foreign record');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (targetTable && targetId != null) {
      loadData();
    }

    return () => {
      cancelled = true;
    };
  }, [targetTable, targetId]);

  const copyToClipboard = (key: string, val: any) => {
    navigator.clipboard.writeText(String(val));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[450px] bg-white dark:bg-zinc-900 border-l border-slate-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200 transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-950/60">
        <div className="flex items-center space-x-2">
          <Link2 size={16} className="text-blue-500 dark:text-blue-400" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 font-mono">
            {targetTable} <span className="text-slate-500 dark:text-zinc-500 font-normal">#{targetId}</span>
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onNavigateToTable(targetTable)}
            className="p-1.5 rounded text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition"
            title="Open table in view"
          >
            <ExternalLink size={15} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-3">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-500 dark:text-zinc-500 font-mono">Loading record details...</p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-lg bg-rose-50 dark:bg-red-950/40 border border-rose-200 dark:border-red-800/50 text-rose-700 dark:text-red-300 text-xs font-mono">
            <p className="font-semibold">Error:</p>
            <p className="mt-1">{error}</p>
          </div>
        ) : record ? (
          <div className="space-y-4 font-mono text-xs">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-zinc-500 font-semibold mb-2">
              Record Attributes
            </div>

            <div className="border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800/60 bg-slate-50/50 dark:bg-zinc-950/40">
              {Object.entries(record).map(([colName, value]) => {
                const colMeta = schema?.columns.find((c) => c.name === colName);
                const fkInfo = colMeta?.foreign_key;
                const isPk = colMeta?.primary;

                return (
                  <div key={colName} className="p-2.5 flex flex-col space-y-1 hover:bg-slate-100/50 dark:hover:bg-zinc-900/40 transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-slate-600 dark:text-zinc-400">
                        {isPk && <Key size={11} className="text-amber-500 dark:text-amber-400" />}
                        {fkInfo && <Link2 size={11} className="text-blue-500 dark:text-blue-400" />}
                        <span className="font-medium text-slate-800 dark:text-zinc-300">{colName}</span>
                        {colMeta && (
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">
                            ({colMeta.type})
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => copyToClipboard(colName, value)}
                        className="text-slate-400 hover:text-slate-700 dark:text-zinc-600 dark:hover:text-zinc-300 transition"
                        title="Copy value"
                      >
                        {copiedKey === colName ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>

                    <div className="mt-0.5">
                      {value === null ? (
                        <span className="text-slate-400 dark:text-zinc-600 italic">null</span>
                      ) : fkInfo && value ? (
                        <button
                          onClick={() => onSelectNestedFk(fkInfo.to_table, value)}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:border-blue-800/60 dark:text-blue-300 dark:hover:bg-blue-900/60 transition text-xs"
                        >
                          <Link2 size={10} />
                          <span>{fkInfo.to_table} #{String(value)}</span>
                          <span className="text-[10px] text-blue-500 dark:text-blue-400">↗</span>
                        </button>
                      ) : typeof value === 'boolean' ? (
                        <span className={`px-1.5 py-0.5 rounded text-[11px] ${value ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-red-950 dark:text-red-300'}`}>
                          {value ? 'true' : 'false'}
                        </span>
                      ) : typeof value === 'object' ? (
                        <pre className="p-2 bg-slate-100 dark:bg-zinc-950 rounded text-[11px] text-slate-800 dark:text-zinc-300 overflow-x-auto border border-slate-200 dark:border-zinc-800/80">
                          {JSON.stringify(value, null, 2)}
                        </pre>
                      ) : (
                        <div className="text-slate-800 dark:text-zinc-200 break-all select-text font-mono">
                          {String(value)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
