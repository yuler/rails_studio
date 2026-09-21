import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Download,
  Clock,
  Database,
  AlertCircle,
  CheckCircle2,
  Terminal,
  Columns2,
  Rows2,
  Wand2,
  Trash2,
  Copy,
  Check,
  Search,
  Plus,
  X,
  Table,
  Columns,
  Sparkles,
  Zap,
  Star
} from 'lucide-react';
import { executeQuery, fetchConsoleCompletions, fetchTableSchema } from '../api';
import { QueryResult, TableMeta, ConsoleModelMeta, TableSchema } from '../types';
import { SqlResultTable, SqlResultTableHandle } from './SqlResultTable';
import { SqlStarsModal, StarredQuery } from './SqlStarsModal';

interface SqlRunnerProps {
  tables: TableMeta[];
  editorFocusNonce?: number;
  onOpenConsole?: (initialCommand?: string) => void;
}

interface QueryTab {
  id: string;
  name: string;
  sql: string;
  result: QueryResult | null;
  error: string | null;
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

export const SqlRunner: React.FC<SqlRunnerProps> = ({ tables, editorFocusNonce = 0, onOpenConsole }) => {
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const kbdClass =
    'hidden sm:inline-flex px-1 py-0.5 text-[9px] font-mono rounded border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500';
  const altChord = (key: string) => `Ctrl+Alt+${key}`;
  const runChord = isMac ? 'Cmd+Enter' : 'Ctrl+Enter';
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
  const [showStars, setShowStars] = useState(false);
  const [stars, setStars] = useState<StarredQuery[]>(() => {
    try {
      const stored = localStorage.getItem('rails_studio_sql_stars');
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed)
        ? parsed.map((item: Partial<StarredQuery>) => ({
            id: String(item.id || Date.now()),
            name: typeof item.name === 'string' ? item.name : '',
            sql: String(item.sql || ''),
            createdAt: Number(item.createdAt) || Date.now()
          }))
        : [];
    } catch {
      return [];
    }
  });
  const [showSaveStar, setShowSaveStar] = useState(false);
  const [starName, setStarName] = useState('');
  const starNameRef = useRef<HTMLInputElement>(null);

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
  const [editorFocused, setEditorFocused] = useState(false);
  const [resultSchema, setResultSchema] = useState<TableSchema | null>(null);
  const [pane, setPane] = useState<'editor' | 'results'>('editor');
  const [resultSelectedCount, setResultSelectedCount] = useState(0);
  const resultsPaneRef = useRef<HTMLDivElement>(null);
  const resultTableRef = useRef<SqlResultTableHandle>(null);

  const focusEditor = () => {
    setPane('editor');
    textareaRef.current?.focus();
  };

  const focusResults = () => {
    setPane('results');
    textareaRef.current?.blur();
    resultsPaneRef.current?.focus();
  };

  useEffect(() => {
    if (!editorFocusNonce) return;
    const id = requestAnimationFrame(() => focusEditor());
    return () => cancelAnimationFrame(id);
  }, [editorFocusNonce]);

  useEffect(() => {
    if (!result?.table_name) {
      setResultSchema(null);
      return;
    }
    let cancelled = false;
    fetchTableSchema(result.table_name)
      .then((schema) => {
        if (!cancelled) setResultSchema(schema);
      })
      .catch(() => {
        if (!cancelled) setResultSchema(null);
      });
    return () => {
      cancelled = true;
    };
  }, [result?.table_name, activeTabId]);

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
      setResultSelectedCount(0);
      focusResults();
    } catch (err: any) {
      const errorMsg = err.message || 'Query execution failed';
      setResultAndError(null, errorMsg);
    } finally {
      setLoading(false);
    }
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
    focusEditor();
  };

  const persistStars = (next: StarredQuery[]) => {
    setStars(next);
    try {
      localStorage.setItem('rails_studio_sql_stars', JSON.stringify(next));
    } catch {}
  };

  const defaultStarName = (value: string) => {
    const line = value.trim().split('\n')[0].replace(/\s+/g, ' ');
    return line.slice(0, 80);
  };

  const openSaveStar = () => {
    const trimmed = sql.trim();
    if (!trimmed) return;
    const existing = stars.find((s) => s.sql.trim() === trimmed);
    setStarName(existing?.name?.trim() || defaultStarName(trimmed));
    setShowSaveStar(true);
    requestAnimationFrame(() => {
      starNameRef.current?.focus();
      starNameRef.current?.select();
    });
  };

  const handleSaveStar = () => {
    const trimmed = sql.trim();
    if (!trimmed) return;
    const name = starName.trim() || defaultStarName(trimmed);
    const existing = stars.find((s) => s.sql.trim() === trimmed);
    if (existing) {
      persistStars(
        stars.map((s) => (s.id === existing.id ? { ...s, name, sql: trimmed } : s))
      );
    } else {
      persistStars([
        { id: String(Date.now()), name, sql: trimmed, createdAt: Date.now() },
        ...stars
      ]);
    }
    setShowSaveStar(false);
  };

  const handleRemoveStar = (id: string) => {
    persistStars(stars.filter((s) => s.id !== id));
  };

  const handleApplyStar = (starSql: string) => {
    setSql(starSql);
    focusEditor();
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
    // Suggestions navigation (Tab while popup is open accepts; otherwise Tab switches panes)
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
        e.stopPropagation();
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.blur();
      setPane('editor');
      return;
    }
  };

  const handleEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    setSql(nextVal);
    updateSuggestions(nextVal, e.target.selectionStart);
  };

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showSaveStar) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setShowSaveStar(false);
        return;
      }
      if (showStars) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setShowStars(false);
      }
    };
    window.addEventListener('keydown', onEscape, true);
    return () => window.removeEventListener('keydown', onEscape, true);
  }, [showStars, showSaveStar]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showStars || showSaveStar) return;

      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (
          e.target === textareaRef.current &&
          showSuggestions &&
          suggestions.length > 0
        ) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        if (pane === 'editor' || e.target === textareaRef.current) {
          focusResults();
        } else {
          focusEditor();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        setShowSuggestions(false);
        handleRun();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.code === 'KeyS') {
        e.preventDefault();
        openSaveStar();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.code === 'Backslash') {
        e.preventDefault();
        handleToggleSplit();
        return;
      }

      // Ctrl+Alt chords work while the SQL textarea is focused
      if (e.ctrlKey && e.altKey && !e.metaKey) {
        if (e.code === 'KeyF') {
          e.preventDefault();
          handleFormat();
        } else if (e.code === 'KeyX') {
          e.preventDefault();
          handleClear();
        } else if (e.code === 'KeyS') {
          e.preventDefault();
          setShowStars((prev) => !prev);
        } else if (e.code === 'KeyN') {
          e.preventDefault();
          handleAddTab();
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pane, sql, showSuggestions, suggestions.length, splitMode, loading, tabs.length, showStars, showSaveStar, stars]);

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

  const isRailsExpressionError = Boolean(
    error && (error.includes('Rails Console') || error.includes('Active Record expression'))
  );

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-zinc-950 select-none transition-colors">
      {/* 1. Drizzle Studio Style Header Bar */}
      <div className="h-[46px] px-2.5 bg-slate-50/90 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0 gap-2">
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
            type="button"
            tabIndex={-1}
            onClick={handleAddTab}
            className="flex items-center gap-1 p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-300 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition"
            title={`New Query Tab (${altChord('N')})`}
          >
            <Plus size={13} />
            <kbd className={kbdClass}>{altChord('N')}</kbd>
          </button>
        </div>

        {/* Right: Quick Action Buttons & Split Toggle */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowStars(true)}
            className={`px-2.5 py-1 text-xs font-mono rounded-md border transition flex items-center space-x-1 shadow-xs ${
              showStars
                ? 'bg-slate-200 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 text-slate-900 dark:text-zinc-100'
                : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800'
            }`}
            title={`Starred queries (${altChord('S')})`}
          >
            <Star size={12} className={stars.length > 0 ? 'text-amber-500 fill-amber-500' : ''} />
            <span className="hidden sm:inline">Stars</span>
            <kbd className={kbdClass}>{altChord('S')}</kbd>
            {stars.length > 0 && (
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">({stars.length})</span>
            )}
          </button>

          {/* Format / Prettify SQL */}
          <button
            type="button"
            tabIndex={-1}
            onClick={handleFormat}
            disabled={!sql.trim()}
            className="px-2.5 py-1 text-xs font-mono rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition disabled:opacity-40 shadow-xs flex items-center space-x-1"
            title={`Format / Prettify SQL (${altChord('F')})`}
          >
            <Wand2 size={13} />
            <span className="hidden sm:inline">Format</span>
            <kbd className={kbdClass}>{altChord('F')}</kbd>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={handleClear}
            disabled={!sql.trim()}
            className="px-2.5 py-1 text-xs font-mono rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition disabled:opacity-40 shadow-xs flex items-center space-x-1"
            title={`Clear SQL editor (${altChord('X')})`}
          >
            <Trash2 size={13} />
            <span className="hidden sm:inline">Clear</span>
            <kbd className={kbdClass}>{altChord('X')}</kbd>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={handleToggleSplit}
            className="px-2.5 py-1 text-xs font-mono rounded-md border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-800 transition shadow-xs flex items-center space-x-1"
            title={`Switch to ${splitMode === 'horizontal' ? 'Side-by-side (Vertical)' : 'Stacked (Horizontal)'} layout (Ctrl+\\)`}
          >
            {splitMode === 'horizontal' ? <Columns2 size={13} /> : <Rows2 size={13} />}
            <kbd className={kbdClass}>Ctrl+\</kbd>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={() => handleRun()}
            disabled={loading || !sql.trim()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-medium text-xs shadow-sm transition disabled:opacity-50"
            title={`Run Query (${runChord})`}
          >
            <Play size={12} className={loading ? 'animate-spin' : ''} />
            <span>{loading ? 'Running...' : 'Run'}</span>
            <kbd className="hidden sm:inline-flex px-1 py-0.2 text-[9px] font-mono rounded bg-slate-800 dark:bg-zinc-200 text-slate-300 dark:text-zinc-700">
              {runChord}
            </kbd>
          </button>
        </div>
      </div>

      {/* 2. Main Workspace (Split horizontal or vertical) */}
      <div className={`flex-1 flex overflow-hidden ${splitMode === 'vertical' ? 'flex-row' : 'flex-col'}`}>
        {/* Editor Area */}
        <div
          ref={editorContainerRef}
          onMouseDown={() => setPane('editor')}
          className={`flex flex-col relative overflow-hidden bg-white dark:bg-zinc-950 ${
            splitMode === 'vertical'
              ? 'w-1/2 border-r border-slate-200 dark:border-zinc-800'
              : 'h-[42%] border-b border-slate-200 dark:border-zinc-800'
          }`}
        >
          {/* Textarea + Line Numbers Gutter */}
          <div
            className={`flex-1 flex overflow-hidden relative font-mono text-xs transition-shadow ${
              pane === 'editor'
                ? 'ring-1 ring-inset ring-slate-400 dark:ring-zinc-500'
                : ''
            }`}
          >
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
              onFocus={() => {
                setEditorFocused(true);
                setPane('editor');
              }}
              onBlur={() => setEditorFocused(false)}
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
                  <span>Tab or Enter to apply</span>
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
              <span>Tab switches editor / results</span>
              <span>•</span>
              <span>{isMac ? 'Cmd+S' : 'Ctrl+S'} to star</span>
            </div>
            <div>
              <span>{sql.length} chars</span>
              <span className="mx-1.5">•</span>
              <span>{lineCount} lines</span>
            </div>
          </div>
        </div>

        {/* Results Area */}
        <div
          ref={resultsPaneRef}
          tabIndex={-1}
          onMouseDown={() => setPane('results')}
          className={`flex-1 flex flex-col overflow-hidden bg-white dark:bg-zinc-950 outline-none ${
            splitMode === 'vertical' ? 'w-1/2' : 'h-[58%]'
          } ${pane === 'results' ? 'ring-1 ring-inset ring-slate-400 dark:ring-zinc-500' : ''}`}
        >
          {/* Results Bar */}
          <div className="h-10 px-3 bg-slate-50/80 dark:bg-zinc-900/40 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs font-mono text-slate-600 dark:text-zinc-400 shrink-0 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {result && result.rows && result.rows.length > 0 && (
                <>
                  <div className="relative shrink-0">
                    <Search size={12} className="absolute left-2 top-2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Filter results..."
                      value={resultFilter}
                      onChange={(e) => setResultFilter(e.target.value)}
                      onFocus={() => setPane('results')}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          e.stopPropagation();
                          e.currentTarget.blur();
                        }
                      }}
                      className="w-36 lg:w-44 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md pl-6 pr-2 py-1 text-[11px] font-mono text-slate-800 dark:text-zinc-200 placeholder-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-zinc-700 shadow-xs"
                    />
                    {resultFilter && (
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setResultFilter('')}
                        className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                  {resultSelectedCount > 0 && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => void resultTableRef.current?.deleteSelected()}
                      className="px-2.5 py-1 rounded-md bg-rose-50 dark:bg-red-950/80 border border-rose-200 dark:border-red-800 text-rose-700 dark:text-red-300 hover:bg-rose-100 dark:hover:bg-red-900/80 transition flex items-center space-x-1.5 shrink-0"
                      title="Delete selected rows (D)"
                    >
                      <Trash2 size={12} />
                      <span>Delete ({resultSelectedCount})</span>
                      <kbd className="hidden sm:inline-flex px-1.5 py-0.2 text-[9px] font-mono rounded bg-rose-100 dark:bg-red-900/80 border border-rose-200 dark:border-red-800 text-rose-600 dark:text-red-300">
                        D
                      </kbd>
                    </button>
                  )}
                </>
              )}

              <div className="flex items-center space-x-3 truncate min-w-0">
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
            </div>

            {result && result.rows && result.rows.length > 0 && (
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={handleCopyJSON}
                  className="flex items-center space-x-1 px-2 py-1 rounded bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition text-[11px] shadow-xs"
                  title="Copy results as JSON"
                >
                  {copiedResult ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  <span className="hidden sm:inline">{copiedResult ? 'Copied!' : 'JSON'}</span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
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
              <SqlResultTable
                ref={resultTableRef}
                key={`${activeTabId}-${result.duration_ms}-${result.columns.join(',')}`}
                columns={result.columns}
                rows={result.rows}
                tableName={result.table_name}
                primaryKeys={result.primary_keys}
                schema={resultSchema}
                filter={resultFilter}
                navActive={pane === 'results'}
                onActivate={() => setPane('results')}
                onSelectedChange={setResultSelectedCount}
                onRowsChange={(nextRows) => {
                  setResultAndError({ ...result, rows: nextRows, count: nextRows.length }, null);
                }}
              />
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
                    Write raw SQL above and press <span className="font-semibold">{runChord}</span> or click Run
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

      <SqlStarsModal
        isOpen={showStars}
        stars={stars}
        currentSql={sql}
        onClose={() => setShowStars(false)}
        onApply={handleApplyStar}
        onStarCurrent={() => {
          setShowStars(false);
          openSaveStar();
        }}
        onRemove={handleRemoveStar}
      />

      {showSaveStar && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowSaveStar(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-slate-200 dark:border-zinc-800 flex items-center gap-2">
              <Star size={15} className="text-amber-500 fill-amber-500" />
              <h3 className="font-semibold text-sm text-slate-900 dark:text-zinc-100">Save to Stars</h3>
            </div>
            <div className="p-4 space-y-3">
              <label className="block space-y-1.5">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-zinc-500">
                  Name
                </span>
                <input
                  ref={starNameRef}
                  type="text"
                  value={starName}
                  onChange={(e) => setStarName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveStar();
                    }
                  }}
                  placeholder="e.g. active users this week"
                  className="w-full h-9 px-3 text-sm rounded-md border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-slate-400 dark:focus:border-zinc-500"
                />
              </label>
              <pre className="max-h-32 overflow-auto rounded-md border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/80 p-2.5 font-mono text-[11px] text-slate-600 dark:text-zinc-400 whitespace-pre-wrap break-all">
                {sql.trim()}
              </pre>
            </div>
            <div className="px-4 py-3 bg-slate-50 dark:bg-zinc-950/80 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSaveStar(false)}
                className="px-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStar}
                className="px-3 py-1.5 text-xs rounded-md bg-slate-900 hover:bg-slate-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
