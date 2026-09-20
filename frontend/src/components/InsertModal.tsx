import React, { useState } from 'react';
import { X, PlusCircle, AlertCircle } from 'lucide-react';
import { TableSchema, ColumnMeta } from '../types';
import { ForeignKeySelect } from './ForeignKeySelect';

interface InsertModalProps {
  schema: TableSchema;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => Promise<void>;
}

export const InsertModal: React.FC<InsertModalProps> = ({ schema, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    schema.columns.forEach((col) => {
      // Don't auto-fill autoincrement primary key
      if (col.primary && (col.type === 'integer' || col.name === 'id')) return;
      if (col.default !== null && col.default !== undefined) {
        initial[col.name] = col.default;
      } else if (col.type === 'boolean') {
        initial[col.name] = false;
      } else {
        initial[col.name] = '';
      }
    });
    return initial;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Filter empty strings for nullable non-string columns
      const cleanedData: Record<string, any> = {};
      schema.columns.forEach((col) => {
        if (col.primary && (col.type === 'integer' || col.name === 'id') && !formData[col.name]) {
          return;
        }

        const val = formData[col.name];
        if (val === '' && col.null && col.type !== 'string' && col.type !== 'text') {
          cleanedData[col.name] = null;
        } else if (col.type === 'boolean') {
          cleanedData[col.name] = Boolean(val);
        } else if (col.type === 'integer' && val !== '' && val !== null) {
          cleanedData[col.name] = parseInt(val, 10);
        } else if ((col.type === 'float' || col.type === 'decimal') && val !== '' && val !== null) {
          cleanedData[col.name] = parseFloat(val);
        } else {
          cleanedData[col.name] = val;
        }
      });

      await onSubmit(cleanedData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to insert record');
    } finally {
      setLoading(false);
    }
  };

  const firstEditableColName = schema.columns.find(
    (col) => !(col.primary && (col.type === 'integer' || col.name === 'id'))
  )?.name;

  const firstInputRef = React.useRef<any>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (firstInputRef.current) {
        firstInputRef.current.focus();
        if ('select' in firstInputRef.current && typeof firstInputRef.current.select === 'function') {
          firstInputRef.current.select();
        }
      }
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  const renderInput = (col: ColumnMeta, isFirst: boolean) => {
    if (col.primary && (col.type === 'integer' || col.name === 'id')) {
      return (
        <span className="text-slate-400 dark:text-zinc-500 italic text-xs">
          (Auto-generated primary key)
        </span>
      );
    }

    // Foreign key searchable selector
    if (col.foreign_key) {
      return (
        <ForeignKeySelect
          targetTable={col.foreign_key.to_table}
          value={formData[col.name]}
          onChange={(val) => setFormData({ ...formData, [col.name]: val })}
          isNullable={col.null}
          autoFocus={isFirst}
        />
      );
    }

    if (col.enum_values && col.enum_values.length > 0) {
      return (
        <select
          ref={isFirst ? firstInputRef : undefined}
          autoFocus={isFirst}
          value={formData[col.name] ?? ''}
          onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
          className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-slate-500 dark:focus:border-zinc-600 font-mono shadow-xs"
        >
          {col.null && <option value="">(null)</option>}
          {col.enum_values.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );
    }

    if (col.type === 'boolean') {
      return (
        <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-700 dark:text-zinc-300">
          <input
            ref={isFirst ? firstInputRef : undefined}
            autoFocus={isFirst}
            type="checkbox"
            checked={Boolean(formData[col.name])}
            onChange={(e) => setFormData({ ...formData, [col.name]: e.target.checked })}
            className="rounded border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-red-500 focus:ring-0 w-4 h-4"
          />
          <span>{formData[col.name] ? 'True' : 'False'}</span>
        </label>
      );
    }

    // Date and time pickers
    if (col.type === 'datetime' || col.type === 'timestamp') {
      return (
        <input
          ref={isFirst ? firstInputRef : undefined}
          autoFocus={isFirst}
          type="datetime-local"
          value={formData[col.name] ?? ''}
          onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
          className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-slate-500 dark:focus:border-zinc-600 font-mono shadow-xs"
        />
      );
    }

    if (col.type === 'date') {
      return (
        <input
          ref={isFirst ? firstInputRef : undefined}
          autoFocus={isFirst}
          type="date"
          value={formData[col.name] ?? ''}
          onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
          className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-slate-500 dark:focus:border-zinc-600 font-mono shadow-xs"
        />
      );
    }

    if (col.type === 'time') {
      return (
        <input
          ref={isFirst ? firstInputRef : undefined}
          autoFocus={isFirst}
          type="time"
          value={formData[col.name] ?? ''}
          onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
          className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-slate-500 dark:focus:border-zinc-600 font-mono shadow-xs"
        />
      );
    }

    if (col.type === 'text' || col.type === 'json' || col.type === 'jsonb') {
      return (
        <textarea
          ref={isFirst ? firstInputRef : undefined}
          autoFocus={isFirst}
          rows={3}
          value={formData[col.name] ?? ''}
          onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
          placeholder={col.type.includes('json') ? '{"key": "value"}' : ''}
          className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-slate-500 dark:focus:border-zinc-600 font-mono shadow-xs"
        />
      );
    }

    return (
      <input
        ref={isFirst ? firstInputRef : undefined}
        autoFocus={isFirst}
        type={col.type === 'integer' || col.type === 'float' || col.type === 'decimal' ? 'number' : 'text'}
        value={formData[col.name] ?? ''}
        onChange={(e) => setFormData({ ...formData, [col.name]: e.target.value })}
        placeholder=""
        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-slate-500 dark:focus:border-zinc-600 font-mono shadow-xs"
      />
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none transition-colors">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-950/40 rounded-t-xl">
          <div className="flex items-center space-x-2">
            <PlusCircle size={16} className="text-emerald-500 dark:text-emerald-400" />
            <h3 className="font-semibold text-slate-900 dark:text-zinc-100 text-sm font-mono">
              Insert into <span className="text-red-500 dark:text-red-400">{schema.table_name}</span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-red-950/40 border border-rose-200 dark:border-red-800/60 rounded text-rose-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {schema.columns.map((col) => {
            const isAutoPk = col.primary && (col.type === 'integer' || col.name === 'id');
            if (isAutoPk) return null;

            return (
              <div key={col.name} className="flex flex-col space-y-1">
                <label className="text-xs font-mono text-slate-500 dark:text-zinc-400 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-medium text-slate-800 dark:text-zinc-200">{col.name}</span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500">({col.type})</span>
                    {!col.null && <span className="text-red-500 dark:text-red-400 text-xs">*</span>}
                  </div>
                  {col.foreign_key && (
                    <span className="text-[10px] text-blue-500 dark:text-blue-400">
                      → {col.foreign_key.to_table}
                    </span>
                  )}
                </label>
                {renderInput(col, col.name === firstEditableColName)}
              </div>
            );
          })}

          <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Inserting...' : 'Insert Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
