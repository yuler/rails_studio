import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Download,
  Clock,
  Database,
  AlertCircle,
  FileText,
  CheckCircle2,
  Terminal,
  Columns2,
  Rows2,
  Wand2,
  Trash2,
  Copy,
  Check,
  History,
  Search,
  Plus,
  X,
  Table,
  Columns,
  Sparkles,
  Zap,
  ChevronDown
} from 'lucide-react';
import { executeQuery, fetchConsoleCompletions } from '../api';
import { QueryResult, TableMeta, ConsoleModelMeta } from '../types';

interface SqlRunnerProps {
  tables: TableMeta[];
  onOpenConsole?: (initialCommand?: string) => void;
}

interface QueryTab {
  id: string;
  name: string;
  sql: string;
  result: QueryResult | null;
  error: string | null;
}

interface QueryHistoryItem {
  id: string;
  sql: string;
  timestamp: string;
  duration_ms?: number;
  success: boolean;
  rowsCount?: number;
}

interface SuggestionItem {
  label: string;
  insertText?: string;
  detail: string;
  type: 'keyword' | 'table' | 'column' | 'function';
}

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'ILIKE',
  'BETWEEN', 'IS NULL', 'IS NOT NULL', 'ORDER BY', 'GROUP BY', 'HAVING',
  'LIMIT', 'OFFSET', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
  'CROSS JOIN', 'ON', 'AS', 'DISTINCT', 'UNION', 'UNION ALL',
  'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
  'CREATE TABLE', 'DROP TABLE', 'ALTER TABLE', 'TRUNCATE',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'ASC', 'DESC', 'EXPLAIN', 'EXPLAIN ANALYZE'
];

const SQL_FUNCTIONS = [
  { name: 'COUNT(*)', insert: 'COUNT(*)', desc: 'Count total rows' },
  { name: 'COUNT()', insert: 'COUNT()', desc: 'Count non-null values' },
  { name: 'SUM()', insert: 'SUM()', desc: 'Sum of numeric values' },
  { name: 'AVG()', insert: 'AVG()', desc: 'Average of values' },
  { name: 'MIN()', insert: 'MIN()', desc: 'Minimum value' },
  { name: 'MAX()', insert: 'MAX()', desc: 'Maximum value' },
  { name: 'COALESCE()', insert: 'COALESCE()', desc: 'First non-null expression' },
  { name: 'NOW()', insert: 'NOW()', desc: 'Current date and time' },
  { name: 'LOWER()', insert: 'LOWER()', desc: 'Lowercase string' },
  { name: 'UPPER()', insert: 'UPPER()', desc: 'Uppercase string' },
  { name: 'CONCAT()', insert: 'CONCAT()', desc: 'Concatenate strings' }
];

export const SqlRunner: React.FC<SqlRunnerProps> = ({ tables, onOpenConsole }) => {
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const firstTableName = tables[0]?.name || 'users';

  // Tabs state (Drizzle Studio multi-tab query runner)
  const [tabs, setTabs] = useState<QueryTab[]>([
    {
      id: 'tab-1',
      name: 'Query 1',
      sql: `SELECT * FROM ${firstTableName} LIMIT 25;`,
      result: null,
      error: null
    }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');

  // Split layout mode: horizontal (stacked) vs vertical (side-by-side)
  const [splitMode, setSplitMode] = useState<'horizontal' | 'vertical'>(() => {
    return (localStorage.getItem('rails_studio_sql_split') as 'horizontal' | 'vertical') || 'horizontal';
  });

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const sql = activeTab?.sql || '';
  const result = activeTab?.result || null;
  const error = activeTab?.error || null;

  const [loading, setLoading] = useState(false);
  const [copiedResult, setCopiedResult] = useState(false);
  const [resultFilter, setResultFilter] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // History state
  const [history, setHistory] = useState<QueryHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('rails_studio_sql_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Schema metadata for IntelliSense
  const [models, setModels] = useState<ConsoleModelMeta[]>([]);
  useEffect(() => {
    fetchConsoleCompletions()
      .then((data) => {
        if (data.models) setModels(data.models);
      })
      .catch(() => {});
  }, []);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [popupPos, setPopupPos] = useState({ top: 40, left: 50 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const setSql = (newSql: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, sql: newSql } : t))
    );
  };

  const setResultAndError = (newResult: QueryResult | null, newError: string | null) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, result: newResult, error: newError } : t))
    );
  };

  const handleToggleSplit = () => {
    const next = splitMode === 'horizontal' ? 'vertical' : 'horizontal';
    setSplitMode(next);
    localStorage.setItem('rails_studio_sql_split', next);
  };

  // Sync line numbers scroll with textarea
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Add new tab
  const handleAddTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab: QueryTab = {
      id: newId,
      name: `Query ${tabs.length + 1}`,
      sql: `SELECT * FROM ${firstTableName} LIMIT 25;`,
      result: null,
      error: null
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newId);
  };

  // Close tab
  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length <= 1) return;
    const nextTabs = tabs.filter((t) => t.id !== id);
    setTabs(nextTabs);
    if (activeTabId === id) {
      setActiveTabId(nextTabs[0].id);
    }
  };

  // Execute SQL
  const handleRun = async (queryOverride?: string) => {
    const queryToRun = (queryOverride || sql).trim();
    if (!queryToRun) return;

    setLoading(true);
    setResultAndError(null, null);

    try {
      const res = await executeQuery(queryToRun);
      setResultAndError(res, null);

      // Add to history
      const histItem: QueryHistoryItem = {
        id: String(Date.now()),
        sql: queryToRun,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        duration_ms: res.duration_ms,
        success: true,
        rowsCount: res.count
      };
      setHistory((prev) => {
        const updated = [histItem, ...prev.slice(0, 49)];
        try {
          localStorage.setItem('rails_studio_sql_history', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    } catch (err: any) {
      const errorMsg = err.message || 'Query execution failed';
      setResultAndError(null, errorMsg);

      const histItem: QueryHistoryItem = {
        id: String(Date.now()),
        sql: queryToRun,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        success: false
      };
      setHistory((prev) => {
        const updated = [histItem, ...prev.slice(0, 49)];
        try {
          localStorage.setItem('rails_studio_sql_history', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  // Explain Query
  const handleExplain = () => {
    let cleanSql = sql.trim().replace(/^EXPLAIN (ANALYZE )?/i, '');
    const explainSql = `EXPLAIN ${cleanSql}`;
    setSql(explainSql);
    handleRun(explainSql);
  };

  // Format / Prettify SQL
  const handleFormat = () => {
    if (!sql.trim()) return;
    let formatted = sql.trim().replace(/\s+/g, ' ');

    SQL_KEYWORDS.forEach((kw) => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      formatted = formatted.replace(regex, kw);
    });

    const breakKeywords = [
      'FROM', 'WHERE', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'JOIN',
      'GROUP BY', 'ORDER BY', 'LIMIT', 'OFFSET', 'HAVING', 'VALUES', 'SET'
    ];
    breakKeywords.forEach((kw) => {
      const regex = new RegExp(`\\s+(${kw})\\b`, 'g');
      formatted = formatted.replace(regex, '\n$1');
    });

    setSql(formatted);
  };

  // Clear query
  const handleClear = () => {
    setSql('');
    setResultAndError(null, null);
    textareaRef.current?.focus();
  };

  // Autocomplete calculation
  const updateSuggestions = (currentText: string, cursorPosition: number) => {
    const textBeforeCursor = currentText.slice(0, cursorPosition);
    const match = textBeforeCursor.match(/([a-zA-Z0-9_.*]+)$/);
    const word = match ? match[1] : '';

    if (!word || word.length < 1) {
      setShowSuggestions(false);
      return;
    }

    const lowerWord = word.toLowerCase();
    const items: SuggestionItem[] = [];

    // Context analysis: check last major keyword
    const upperBefore = textBeforeCursor.toUpperCase();
    const lastFrom = upperBefore.lastIndexOf('FROM');
    const lastJoin = upperBefore.lastIndexOf('JOIN');
    const lastSelect = upperBefore.lastIndexOf('SELECT');
    const lastWhere = upperBefore.lastIndexOf('WHERE');

    const isAfterFromOrJoin = (lastFrom > lastSelect && cursorPosition - lastFrom < 80) ||
                             (lastJoin > lastSelect && cursorPosition - lastJoin < 80);

    // 1. Tables (from tables prop + models)
    const tableNames = Array.from(new Set([
      ...tables.map((t) => t.name),
      ...models.map((m) => m.table_name)
    ])).filter(Boolean);

    tableNames.forEach((tbl) => {
      if (tbl.toLowerCase().includes(lowerWord)) {
        items.push({
          label: tbl,
          detail: 'Table',
          type: 'table'
        });
      }
    });

    // 2. Columns (from models metadata)
    models.forEach((m) => {
      m.columns.forEach((col) => {
        if (col.toLowerCase().includes(lowerWord) && !items.some((i) => i.label === col)) {
          items.push({
            label: col,
            detail: `Column in ${m.table_name}`,
            type: 'column'
          });
        }
      });
    });

    // 3. SQL Keywords
    SQL_KEYWORDS.forEach((kw) => {
      if (kw.toLowerCase().startsWith(lowerWord) && kw.toLowerCase() !== lowerWord) {
        items.push({
          label: kw,
          detail: 'Keyword',
          type: 'keyword'
        });
      }
    });

    // 4. SQL Functions
    SQL_FUNCTIONS.forEach((fn) => {
      if (fn.name.toLowerCase().startsWith(lowerWord)) {
        items.push({
          label: fn.name,
          insertText: fn.insert,
          detail: fn.desc,
          type: 'function'
        });
      }
    });

    // Sort: if after FROM/JOIN, tables first; else keywords & functions & columns
    items.sort((a, b) => {
      if (isAfterFromOrJoin) {
        if (a.type === 'table' && b.type !== 'table') return -1;
        if (a.type !== 'table' && b.type === 'table') return 1;
      }
      const aStarts = a.label.toLowerCase().startsWith(lowerWord) ? 0 : 1;
      const bStarts = b.label.toLowerCase().startsWith(lowerWord) ? 0 : 1;
      return aStarts - bStarts;
    });

    const topItems = items.slice(0, 9);
    if (topItems.length > 0) {
      setSuggestions(topItems);
      setSuggestionIndex(0);
      setShowSuggestions(true);

      // Compute position
      const lines = textBeforeCursor.split('\n');
      const lineIdx = lines.length - 1;
      const colIdx = lines[lineIdx].length;

      const top = Math.min((lineIdx + 1) * 20 + 12, 180);
      const left = Math.min(44 + colIdx * 7.2, 380);
      setPopupPos({ top, left });
    } else {
      setShowSuggestions(false);
    }
  };

  const applySuggestion = (item: SuggestionItem) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const textBefore = sql.slice(0, cursor);
    const textAfter = sql.slice(cursor);
    const match = textBefore.match(/([a-zA-Z0-9_.*]+)$/);
    const wordLen = match ? match[1].length : 0;

    const start = cursor - wordLen;
    const insertion = item.insertText || item.label;
    const nextSql = sql.slice(0, start) + insertion + ' ' + textAfter;

    setSql(nextSql);
    setShowSuggestions(false);

    const nextCursor = start + insertion.length + 1;
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    }, 10);
  };

  // Handle keydown in textarea
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 1. Run Query: Cmd/Ctrl + Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      setShowSuggestions(false);
      handleRun();
      return;
    }

    // 2. Suggestions navigation
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSuggestionIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        applySuggestion(suggestions[suggestionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    // 3. Tab key indentation
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const nextSql = sql.substring(0, start) + '  ' + sql.substring(end);
      setSql(nextSql);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    setSql(nextVal);
    updateSuggestions(nextVal, e.target.selectionStart);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;

      if (e.key === '\\' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        handleToggleSplit();
        return;
      }

      if (!e.shiftKey) return;

      const key = e.key.toLowerCase();
      if (key === 'n') {
        e.preventDefault();
        handleAddTab();
      } else if (key === 'f') {
        e.preventDefault();
        handleFormat();
      } else if (key === 'e') {
        e.preventDefault();
        handleExplain();
      } else if (key === 'h') {
        e.preventDefault();
        setShowHistory((prev) => !prev);
        setShowTemplates(false);
      } else if (key === 'm') {
        e.preventDefault();
        setShowTemplates((prev) => !prev);
        setShowHistory(false);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sql, tabs.length, splitMode, loading]);

  // Export CSV
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
    link.href = url;
    link.setAttribute('download', `query_result_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy JSON
  const handleCopyJSON = () => {
    if (!result || !result.columns || !result.rows) return;
    const objects = result.rows.map((row) => {
      const obj: Record<string, any> = {};
      result.columns.forEach((col, idx) => {
        obj[col] = row[idx];
      });
      return obj;
    });
    navigator.clipboard.writeText(JSON.stringify(objects, null, 2));
    setCopiedResult(true);
    setTimeout(() => setCopiedResult(false), 2000);
  };

  // Line count for gutter
  const lineCount = (sql.split('\n').length) || 1;
  const lines = Array.from({ length: Math.max(lineCount, 6) }, (_, i) => i + 1);

  // Filtered rows
  const filteredRows = React.useMemo(() => {
    if (!result || !result.rows) return [];
    if (!resultFilter.trim()) return result.rows;
    const q = resultFilter.toLowerCase();
    return result.rows.filter((row) =>
      row.some((cell) => cell !== null && cell !== undefined && String(cell).toLowerCase().includes(q))
    );
  }, [result, resultFilter]);

  const isRailsExpressionError = Boolean(
    error && (error.includes('Rails Console') || error.includes('Active Record expression'))
  );

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-zinc-950 select-none transition-colors">
      {/* 1. Drizzle Studio Style Header Bar */}
      <div className="h-10 px-3 bg-slate-50/90 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0 gap-2">
        {/* Left: Query Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`group flex items-center space-x-2 px-3 py-1 text-xs font-mono rounded-md border cursor-pointer transition-all ${
                  isActive
                    ? 'bg-white dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100 shadow-xs font-medium'
                    : 'bg-transparent border-transparent text-slate-500 dark:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-800/50 hover:text-slate-800 dark:hover:text-zinc-200'
                }`}
              >
                <Terminal size={12} className={isActive ? 'text-red-500' : 'text-slate-400 dark:text-zinc-500'} />
                <span className="truncate max-w-[120px]">{tab.name}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-700 transition"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={handleAddTab}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition"
            title={`New Query Tab (${isMac ? '⌘⇧N' : 'Ctrl+Shift+N'})`}
          >
            <Plus size={13} />
          </button>
        </div>

        {/* Right: Quick Action Buttons & Split Toggle */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Templates Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-2.5 py-1 text-xs font-mono rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition flex items-center space-x-1 shadow-xs"
              title={`Quick SQL Templates (${isMac ? '⌘⇧M' : 'Ctrl+Shift+M'})`}
            >
              <FileText size={12} />
              <span>Templates</span>
              <kbd className="hidden lg:inline-flex px-1 py-0.5 text-[9px] font-mono rounded border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500">
                {isMac ? '⌘⇧M' : 'Ctrl+⇧M'}
              </kbd>
              <ChevronDown size={11} />
            </button>

            {showTemplates && (
              <div
                className="absolute right-0 top-8 w-64 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xl py-1 z-30 font-mono text-xs animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setShowTemplates(false)}
              >
                <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400 dark:text-zinc-500 border-b border-slate-100 dark:border-zinc-800">
                  Quick Query Templates
                </div>
                {tables.slice(0, 5).map((t) => (
                  <button
                    key={t.name}
                    onClick={() => setSql(`SELECT * FROM ${t.name} LIMIT 25;`)}
                    className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 truncate"
                  >
                    SELECT * FROM {t.name}
                  </button>
                ))}
                {tables[0] && (
                  <>
                    <button
                      onClick={() => setSql(`SELECT COUNT(*) AS total_count FROM ${tables[0].name};`)}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                    >
                      COUNT(*) in {tables[0].name}
                    </button>
                    <button
                      onClick={() => setSql(`EXPLAIN SELECT * FROM ${tables[0].name} LIMIT 50;`)}
                      className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                    >
                      EXPLAIN query plan
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* History Button */}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-2.5 py-1 text-xs font-mono rounded-md border transition flex items-center space-x-1 shadow-xs ${
              showHistory
                ? 'bg-slate-200 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100'
                : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
            title={`Query Execution History (${isMac ? '⌘⇧H' : 'Ctrl+Shift+H'})`}
          >
            <History size={12} />
            <span className="hidden sm:inline">History</span>
            <kbd className="hidden lg:inline-flex px-1 py-0.5 text-[9px] font-mono rounded border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500">
              {isMac ? '⌘⇧H' : 'Ctrl+⇧H'}
            </kbd>
            {history.length > 0 && (
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">({history.length})</span>
            )}
          </button>

          {/* Format / Prettify SQL */}
          <button
            onClick={handleFormat}
            disabled={!sql.trim()}
            className="p-1.5 rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition disabled:opacity-40 shadow-xs"
            title={`Format / Prettify SQL (${isMac ? '⌘⇧F' : 'Ctrl+Shift+F'})`}
          >
            <Wand2 size={13} />
          </button>

          {/* Clear Editor */}
          <button
            onClick={handleClear}
            disabled={!sql.trim()}
            className="p-1.5 rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition disabled:opacity-40 shadow-xs"
            title={`Clear SQL editor (${isMac ? '⌘⇧⌫' : 'Ctrl+Shift+Backspace'})`}
          >
            <Trash2 size={13} />
          </button>

          {/* Layout Direction Toggle (Drizzle Studio feature) */}
          <button
            onClick={handleToggleSplit}
            className="p-1.5 rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition shadow-xs"
            title={`Switch to ${splitMode === 'horizontal' ? 'Side-by-side (Vertical)' : 'Stacked (Horizontal)'} layout (${isMac ? '⌘\\' : 'Ctrl+\\'})`}
          >
            {splitMode === 'horizontal' ? <Columns2 size={13} /> : <Rows2 size={13} />}
          </button>

          {/* Explain Button */}
          <button
            onClick={handleExplain}
            disabled={loading || !sql.trim()}
            className="px-2.5 py-1 text-xs font-mono rounded-md border border-slate-300 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-medium transition flex items-center space-x-1 disabled:opacity-40 shadow-xs"
            title={`Explain Query Execution Plan (${isMac ? '⌘⇧E' : 'Ctrl+Shift+E'})`}
          >
            <Zap size={12} className="text-amber-500" />
            <span className="hidden sm:inline">Explain</span>
            <kbd className="hidden lg:inline-flex px-1 py-0.5 text-[9px] font-mono rounded border border-slate-300 dark:border-zinc-600 bg-white/50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400">
              {isMac ? '⌘⇧E' : 'Ctrl+⇧E'}
            </kbd>
          </button>

          {/* Run Query Button */}
          <button
            onClick={() => handleRun()}
            disabled={loading || !sql.trim()}
            className="flex items-center space-x-1.5 px-3.5 py-1 rounded-md bg-red-600 hover:bg-red-500 text-white font-medium text-xs shadow-sm transition disabled:opacity-50"
            title={`Run Query (${isMac ? '⌘↵' : 'Ctrl+↵'})`}
          >
            <Play size={12} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Running...' : 'Run'}</span>
            <kbd className="hidden sm:inline-flex px-1.5 py-0.2 text-[9px] font-mono rounded bg-red-700 text-red-100 border border-red-500/40">
              {isMac ? '⌘↵' : 'Ctrl+↵'}
            </kbd>
          </button>
        </div>
      </div>

      {/* 2. Main Workspace (Split horizontal or vertical) */}
      <div className={`flex-1 flex overflow-hidden ${splitMode === 'vertical' ? 'flex-row' : 'flex-col'}`}>
        {/* Editor Area */}
        <div
          ref={editorContainerRef}
          className={`flex flex-col relative overflow-hidden bg-white dark:bg-zinc-950 ${
            splitMode === 'vertical'
              ? 'w-1/2 border-r border-slate-200 dark:border-zinc-800'
              : 'h-[42%] border-b border-slate-200 dark:border-zinc-800'
          }`}
        >
          {/* Textarea + Line Numbers Gutter */}
          <div className="flex-1 flex overflow-hidden relative font-mono text-xs">
            {/* Line numbers */}
            <div
              ref={lineNumbersRef}
              className="w-10 select-none py-3 text-right pr-2.5 text-slate-400 dark:text-zinc-600 bg-slate-50/60 dark:bg-zinc-950/80 border-r border-slate-200/80 dark:border-zinc-800/80 overflow-hidden font-mono"
            >
              {lines.map((n) => (
                <div key={n} style={{ height: '20px', lineHeight: '20px' }}>
                  {n}
                </div>
              ))}
            </div>

            {/* SQL Input Textarea */}
            <textarea
              ref={textareaRef}
              value={sql}
              onChange={handleEditorChange}
              onKeyDown={handleEditorKeyDown}
              onScroll={handleScroll}
              style={{ lineHeight: '20px' }}
              placeholder="Type your SQL query here... (e.g. SELECT * FROM users WHERE active = true)"
              className="flex-1 bg-transparent p-3 text-xs font-mono text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none resize-none overflow-auto whitespace-pre leading-5 selection:bg-red-500/20"
              spellCheck={false}
              autoCapitalize="none"
              autoComplete="off"
            />

            {/* IntelliSense Autocomplete Popup */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                style={{ top: `${popupPos.top}px`, left: `${popupPos.left}px` }}
                className="absolute z-50 w-72 max-h-56 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-2xl overflow-hidden flex flex-col font-mono text-xs animate-in fade-in duration-75"
              >
                <div className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-[10px] text-slate-500 dark:text-zinc-400 flex items-center justify-between border-b border-slate-200 dark:border-zinc-700 select-none">
                  <span className="flex items-center gap-1 font-semibold">
                    <Sparkles size={11} className="text-red-500" />
                    Suggestions
                  </span>
                  <span>Tab ⇥ or ↵ to apply</span>
                </div>
                <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/60">
                  {suggestions.map((item, idx) => (
                    <div
                      key={item.label + idx}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applySuggestion(item);
                      }}
                      className={`px-3 py-1.5 flex items-center justify-between cursor-pointer transition ${
                        idx === suggestionIndex
                          ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-white font-medium'
                          : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {item.type === 'table' ? (
                          <Table size={12} className="text-amber-500 shrink-0" />
                        ) : item.type === 'column' ? (
                          <Columns size={12} className="text-sky-500 shrink-0" />
                        ) : item.type === 'function' ? (
                          <Zap size={12} className="text-emerald-500 shrink-0" />
                        ) : (
                          <Terminal size={12} className="text-purple-500 shrink-0" />
                        )}
                        <span className="truncate font-semibold">{item.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 shrink-0 pl-2">
                        {item.detail}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="h-6 px-3 bg-slate-50 dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800/80 flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500 font-mono select-none">
            <div className="flex items-center space-x-2">
              <span>Press {isMac ? '⌘↵' : 'Ctrl+↵'} to run</span>
              <span>•</span>
              <span>Tab for suggestions</span>
            </div>
            <div>
              <span>{sql.length} chars</span>
              <span className="mx-1.5">•</span>
              <span>{lineCount} lines</span>
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div className={`flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-950 ${splitMode === 'vertical' ? 'w-1/2' : 'h-[58%]'}`}>
          {/* Results Bar */}
          <div className="h-10 px-3 bg-slate-50/80 dark:bg-zinc-900/40 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs font-mono text-slate-600 dark:text-zinc-400 shrink-0 gap-2">
            <div className="flex items-center space-x-3 truncate">
              {result ? (
                <>
                  <span className="flex items-center gap-1.5 text-slate-900 dark:text-zinc-100 font-semibold">
                    <CheckCircle2 size={13} className="text-emerald-500" />
                    <span>
                      {result.message || `${result.count} ${result.count === 1 ? 'row' : 'rows'}`}
                    </span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-500 dark:text-zinc-400">
                    <Clock size={12} className="text-slate-400 dark:text-zinc-500" />
                    <span>{result.duration_ms} ms</span>
                  </span>
                </>
              ) : error ? (
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
                  <AlertCircle size={13} />
                  <span>Execution failed</span>
                </span>
              ) : (
                <span className="text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                  <Database size={13} />
                  <span>Query Results</span>
                </span>
              )}
            </div>

            {/* Results Filter & Export Controls */}
            {result && result.rows && result.rows.length > 0 && (
              <div className="flex items-center space-x-2">
                {/* In-results Search Filter */}
                <div className="relative hidden md:block">
                  <Search size={12} className="absolute left-2 top-2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filter results..."
                    value={resultFilter}
                    onChange={(e) => setResultFilter(e.target.value)}
                    className="w-36 lg:w-44 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md pl-6 pr-2 py-1 text-[11px] font-mono text-slate-800 dark:text-zinc-200 placeholder-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-700 shadow-xs"
                  />
                  {resultFilter && (
                    <button
                      onClick={() => setResultFilter('')}
                      className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>

                {/* Copy JSON */}
                <button
                  onClick={handleCopyJSON}
                  className="flex items-center space-x-1 px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition text-[11px] shadow-xs"
                  title="Copy results as JSON"
                >
                  {copiedResult ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  <span className="hidden sm:inline">{copiedResult ? 'Copied!' : 'JSON'}</span>
                </button>

                {/* Export CSV */}
                <button
                  onClick={exportCSV}
                  className="flex items-center space-x-1 px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition text-[11px] shadow-xs"
                  title="Export results to CSV"
                >
                  <Download size={12} />
                  <span className="hidden sm:inline">CSV</span>
                </button>
              </div>
            )}
          </div>

          {/* Results Body / Spreadsheet or Error or Empty */}
          <div className="flex-1 overflow-auto relative">
            {error ? (
              <div className="p-6">
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-red-950/40 border border-rose-200 dark:border-red-900/60 text-rose-700 dark:text-red-300 text-xs font-mono flex flex-col space-y-3 shadow-xs">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={17} className="shrink-0 mt-0.5 text-red-500" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">ActiveRecord Query Error</p>
                      <p className="mt-1 whitespace-pre-wrap leading-relaxed">{error}</p>
                    </div>
                  </div>

                  {isRailsExpressionError && onOpenConsole && (
                    <div className="pt-2 border-t border-rose-200 dark:border-red-900/50 flex justify-end">
                      <button
                        onClick={() => onOpenConsole(sql.trim())}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-sans text-xs flex items-center gap-1.5 transition shadow-sm font-medium"
                      >
                        <Terminal size={13} />
                        <span>Open & Evaluate in Rails Console</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : result && result.columns && result.columns.length > 0 ? (
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead className="bg-slate-100/90 dark:bg-zinc-900 sticky top-0 border-b border-slate-200 dark:border-zinc-800 z-10 backdrop-blur shadow-xs">
                  <tr>
                    <th className="p-2.5 w-12 text-slate-400 dark:text-zinc-500 text-[10px] uppercase font-medium border-r border-slate-200 dark:border-zinc-800/80 text-center">
                      #
                    </th>
                    {result.columns.map((col) => (
                      <th
                        key={col}
                        className="p-2.5 text-slate-700 dark:text-zinc-300 font-medium text-xs border-r border-slate-200 dark:border-zinc-800/80 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/40">
                  {filteredRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-50 dark:hover:bg-zinc-900/50 transition">
                      <td className="p-2.5 text-slate-400 dark:text-zinc-600 text-center text-[10px] border-r border-slate-100 dark:border-zinc-800/40">
                        {rowIdx + 1}
                      </td>
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          className="p-2.5 text-slate-800 dark:text-zinc-200 border-r border-slate-100 dark:border-zinc-800/40 whitespace-nowrap max-w-sm truncate select-text"
                        >
                          {cell === null ? (
                            <span className="text-slate-400 dark:text-zinc-600 italic">null</span>
                          ) : typeof cell === 'boolean' ? (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              cell ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                            }`}>
                              {String(cell)}
                            </span>
                          ) : (
                            String(cell)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {filteredRows.length === 0 && resultFilter && (
                    <tr>
                      <td colSpan={result.columns.length + 1} className="p-8 text-center text-slate-400 dark:text-zinc-500 font-mono">
                        No rows match filter "{resultFilter}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : result && result.columns && result.columns.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center font-mono space-y-2">
                <CheckCircle2 size={32} className="text-emerald-500 animate-in zoom-in-75" />
                <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200">
                  {result.message || 'Statement executed successfully'}
                </p>
                <p className="text-xs text-slate-500 dark:text-zinc-500">
                  Execution time: {result.duration_ms} ms
                </p>
              </div>
            ) : !loading ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center font-mono text-xs text-slate-400 dark:text-zinc-500 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-500">
                  <Terminal size={22} />
                </div>
                <div>
                  <p className="font-semibold text-slate-700 dark:text-zinc-300">Ready to execute SQL query</p>
                  <p className="text-[11px] mt-1 text-slate-400 dark:text-zinc-500">
                    Write raw SQL above and press <span className="font-semibold">{isMac ? '⌘ Enter' : 'Ctrl+Enter'}</span> or click Run
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  {tables.slice(0, 3).map((t) => (
                    <button
                      key={t.name}
                      onClick={() => {
                        const q = `SELECT * FROM ${t.name} LIMIT 25;`;
                        setSql(q);
                        handleRun(q);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-[11px] border border-slate-200 dark:border-zinc-800 transition shadow-xs"
                    >
                      Browse {t.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 3. Query History Drawer */}
      {showHistory && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowHistory(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-zinc-900 h-full border-l border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History size={16} className="text-slate-700 dark:text-zinc-300" />
                <h3 className="font-semibold text-sm text-slate-900 dark:text-zinc-100">Query History</h3>
              </div>
              <div className="flex items-center space-x-1">
                {history.length > 0 && (
                  <button
                    onClick={() => {
                      setHistory([]);
                      localStorage.removeItem('rails_studio_sql_history');
                    }}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition"
                    title="Clear history"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/60 p-2 space-y-1">
              {history.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 dark:text-zinc-500 font-mono">
                  No query history recorded yet
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSql(item.sql);
                      setShowHistory(false);
                      textareaRef.current?.focus();
                    }}
                    className="p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-zinc-800/60 cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-zinc-700/60 transition space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 dark:text-zinc-500">
                      <span className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${item.success ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span>{item.timestamp}</span>
                      </span>
                      {item.duration_ms !== undefined && (
                        <span>{item.duration_ms} ms</span>
                      )}
                    </div>
                    <pre className="font-mono text-xs text-slate-800 dark:text-zinc-200 whitespace-pre-wrap break-all line-clamp-3 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                      {item.sql}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
