import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Table,
  Terminal,
  Database,
  Plus,
  RefreshCw,
  Filter,
  Moon,
  Sun,
  Keyboard,
  X,
  Sparkles,
  Save,
  Undo2,
  Code,
  PanelLeft
} from 'lucide-react';
import { TableMeta } from '../types';
import { useTheme } from '../theme';

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Tables' | 'Actions' | 'Navigation' | 'Appearance' | 'Help';
  icon: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  tables: TableMeta[];
  selectedTable: string | null;
  onSelectTable: (tableName: string) => void;
  activeTab: 'tables' | 'sql';
  onSelectTab: (tab: 'tables' | 'sql') => void;
  onToggleConsole: () => void;
  onOpenInsertModal: () => void;
  onRefreshTable: () => void;
  onToggleFilterBar: () => void;
  onSaveChanges?: () => void;
  onDiscardChanges?: () => void;
  stagedChangesCount: number;
  onOpenShortcutsHelp: () => void;
  onToggleSidebar?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  tables,
  selectedTable,
  onSelectTable,
  activeTab,
  onSelectTab,
  onToggleConsole,
  onOpenInsertModal,
  onRefreshTable,
  onToggleFilterBar,
  onSaveChanges,
  onDiscardChanges,
  stagedChangesCount,
  onOpenShortcutsHelp,
  onToggleSidebar
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme, toggleTheme } = useTheme();

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Build the list of commands
  const allCommands = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [];

    // 1. Table items
    tables.forEach((tbl) => {
      const isCurrent = activeTab === 'tables' && selectedTable === tbl.name;
      items.push({
        id: `table-${tbl.name}`,
        title: tbl.name,
        subtitle: `${tbl.row_count?.toLocaleString() ?? 0} rows • ${tbl.model_name || 'ActiveRecord'}`,
        category: 'Tables',
        icon: <Table size={15} className={isCurrent ? 'text-red-500' : 'text-slate-400 dark:text-zinc-500'} />,
        onSelect: () => {
          onSelectTab('tables');
          onSelectTable(tbl.name);
        }
      });
    });

    // 2. Table-specific Actions (when a table is active)
    if (selectedTable) {
      items.push({
        id: 'action-add-row',
        title: `Add new row to ${selectedTable}`,
        subtitle: 'Insert a new record',
        category: 'Actions',
        icon: <Plus size={15} className="text-emerald-500" />,
        shortcut: 'N',
        onSelect: () => {
          onSelectTab('tables');
          onOpenInsertModal();
        }
      });

      items.push({
        id: 'action-refresh',
        title: `Refresh ${selectedTable} records`,
        subtitle: 'Reload table schema and current page rows',
        category: 'Actions',
        icon: <RefreshCw size={15} className="text-blue-500" />,
        shortcut: 'R',
        onSelect: onRefreshTable
      });

      items.push({
        id: 'action-filter',
        title: 'Toggle column filters',
        subtitle: 'Filter records by column values and conditions',
        category: 'Actions',
        icon: <Filter size={15} className="text-amber-500" />,
        shortcut: 'F',
        onSelect: onToggleFilterBar
      });
    }

    // 3. Staged changes actions
    if (stagedChangesCount > 0 && onSaveChanges) {
      items.push({
        id: 'action-save',
        title: `Save ${stagedChangesCount} pending changes`,
        subtitle: 'Commit cell edits to database',
        category: 'Actions',
        icon: <Save size={15} className="text-emerald-500" />,
        shortcut: 'Ctrl+S',
        onSelect: onSaveChanges
      });

      if (onDiscardChanges) {
        items.push({
          id: 'action-discard',
          title: `Discard ${stagedChangesCount} pending changes`,
          subtitle: 'Revert all unstaged cell edits',
          category: 'Actions',
          icon: <Undo2 size={15} className="text-rose-500" />,
          shortcut: 'Ctrl+C',
          onSelect: onDiscardChanges
        });
      }
    }

    const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
    const modKey = isMac ? '⌘' : 'Ctrl';

    // 4. Navigation & Views
    items.push({
      id: 'nav-tables',
      title: 'Go to Tables Browser',
      subtitle: 'Browse and edit database tables and associations',
      category: 'Navigation',
      icon: <Database size={15} className="text-blue-500" />,
      shortcut: `${modKey}+[`,
      onSelect: () => onSelectTab('tables')
    });

    items.push({
      id: 'nav-sql',
      title: 'Go to SQL Runner',
      subtitle: 'Write and run arbitrary SQL queries',
      category: 'Navigation',
      icon: <Code size={15} className="text-purple-500" />,
      shortcut: `${modKey}+]`,
      onSelect: () => onSelectTab('sql')
    });

    items.push({
      id: 'nav-console',
      title: 'Toggle Rails Console Terminal',
      subtitle: 'Evaluate ActiveRecord & Ruby expressions in real-time',
      category: 'Navigation',
      icon: <Terminal size={15} className="text-red-500" />,
      shortcut: 'Ctrl+`',
      onSelect: onToggleConsole
    });

    if (onToggleSidebar) {
      items.push({
        id: 'nav-sidebar',
        title: 'Toggle sidebar',
        subtitle: 'Show or hide the left brand column and table list',
        category: 'Navigation',
        icon: <PanelLeft size={15} className="text-slate-500" />,
        shortcut: 'Ctrl+B',
        onSelect: onToggleSidebar
      });
    }

    // 5. Appearance
    items.push({
      id: 'pref-theme',
      title: `Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} Mode`,
      subtitle: 'Toggle color theme appearance',
      category: 'Appearance',
      icon: resolvedTheme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-slate-600" />,
      shortcut: 'T',
      onSelect: toggleTheme
    });

    // 6. Help
    items.push({
      id: 'help-shortcuts',
      title: 'Keyboard Shortcuts Reference',
      subtitle: 'View all keyboard shortcuts and keybindings',
      category: 'Help',
      icon: <Keyboard size={15} className="text-slate-500 dark:text-zinc-400" />,
      shortcut: '?',
      onSelect: onOpenShortcutsHelp
    });

    return items;
  }, [
    tables,
    selectedTable,
    activeTab,
    stagedChangesCount,
    resolvedTheme,
    onSelectTable,
    onSelectTab,
    onToggleConsole,
    onOpenInsertModal,
    onRefreshTable,
    onToggleFilterBar,
    onSaveChanges,
    onDiscardChanges,
    toggleTheme,
    onOpenShortcutsHelp,
    onToggleSidebar
  ]);

  // Filter commands by query
  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCommands;

    return allCommands.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSub = item.subtitle?.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      return matchTitle || matchSub || matchCat;
    });
  }, [allCommands, query]);

  // Keep selectedIndex in bounds
  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(Math.max(0, filteredCommands.length - 1));
    }
  }, [filteredCommands.length, selectedIndex]);

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredCommands.length > 0 ? (prev + 1) % filteredCommands.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredCommands.length > 0 ? (prev - 1 + filteredCommands.length) % filteredCommands.length : 0
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedItem = filteredCommands[selectedIndex];
      if (selectedItem) {
        selectedItem.onSelect();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  // Group filtered commands by category while tracking global index
  let runningIndex = 0;
  const categories: { name: string; items: { item: CommandItem; index: number }[] }[] = [];
  const categoryMap = new Map<string, { item: CommandItem; index: number }[]>();

  filteredCommands.forEach((item) => {
    if (!categoryMap.has(item.category)) {
      categoryMap.set(item.category, []);
    }
    categoryMap.get(item.category)!.push({ item, index: runningIndex++ });
  });

  categoryMap.forEach((items, name) => {
    categories.push({ name, items });
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-200 dark:border-zinc-800 gap-3">
          <Search size={18} className="text-slate-400 dark:text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a table name or command... (e.g. users, console, theme)"
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 outline-none font-sans"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery('');
                setSelectedIndex(0);
                inputRef.current?.focus();
              }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 p-1"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-3">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-zinc-500 text-xs">
              No results found for <span className="text-slate-700 dark:text-zinc-300 font-mono">"{query}"</span>
            </div>
          ) : (
            categories.map((cat) => (
              <div key={cat.name} className="space-y-0.5">
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  {cat.name}
                </div>
                {cat.items.map(({ item, index }) => {
                  const isActive = index === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      data-active={isActive}
                      onClick={() => {
                        item.onSelect();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm ${
                        isActive
                          ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-zinc-100'
                          : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="shrink-0">{item.icon}</div>
                        <div className="min-w-0">
                          <div className="font-medium truncate font-sans text-[13px] text-slate-900 dark:text-zinc-100">
                            {item.title}
                          </div>
                          {item.subtitle && (
                            <div className="text-xs text-slate-400 dark:text-zinc-500 truncate font-mono">
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                      </div>

                      {item.shortcut && (
                        <kbd className="shrink-0 ml-2 px-1.5 py-0.5 text-[11px] font-mono rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-slate-500 dark:text-zinc-400">
                          {item.shortcut}
                        </kbd>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-zinc-950/80 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500">
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 text-[9px] font-mono rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">↑</kbd>
              <kbd className="px-1 py-0.5 text-[9px] font-mono rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 text-[9px] font-mono rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 text-[9px] font-mono rounded bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700">esc</kbd>
              close
            </span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[10px]">
            <span>Rails Studio Palette</span>
          </div>
        </div>
      </div>
    </div>
  );
};
