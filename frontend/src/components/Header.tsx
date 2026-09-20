import React from 'react';
import { Database, Terminal, Save, Undo2, ShieldAlert, Sun, Moon, Search, Keyboard } from 'lucide-react';
import { DatabaseInfo } from '../types';
import { useTheme } from '../theme';
import { Logo } from './Logo';

interface HeaderProps {
  databaseInfo?: DatabaseInfo;
  activeTab: 'tables' | 'sql';
  setActiveTab: (tab: 'tables' | 'sql') => void;
  stagedChangesCount: number;
  onSaveChanges: () => void;
  onDiscardChanges: () => void;
  savingChanges: boolean;
  consoleOpen?: boolean;
  onToggleConsole?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenShortcuts?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  databaseInfo,
  activeTab,
  setActiveTab,
  stagedChangesCount,
  onSaveChanges,
  onDiscardChanges,
  savingChanges,
  consoleOpen,
  onToggleConsole,
  onOpenCommandPalette,
  onOpenShortcuts
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  return (
    <header className="h-14 border-b border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 backdrop-blur px-4 flex items-center justify-between select-none z-20 shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-none transition-colors">
      {/* Brand & Stats */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2.5">
          <Logo size={24} />
          <span className="font-bold text-slate-900 dark:text-zinc-100 tracking-tight text-base font-mono">
            Rails<span className="text-red-500">Studio</span>
          </span>
        </div>

        {databaseInfo && (
          <div className="flex items-center space-x-2 pl-3 border-l border-slate-200 dark:border-zinc-800 text-xs">
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-mono flex items-center gap-1.5 border border-slate-200 dark:border-zinc-700/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {databaseInfo.adapter}
            </span>
            <span className="text-slate-500 dark:text-zinc-500 font-mono hidden sm:inline-block">
              {databaseInfo.database_name}
            </span>
            <span className="text-slate-300 dark:text-zinc-600 hidden md:inline-block">•</span>
            <span className="text-slate-500 dark:text-zinc-500 font-mono text-[11px] hidden md:inline-block">
              Rails {databaseInfo.rails_version}
            </span>
          </div>
        )}

        {databaseInfo?.read_only && (
          <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50 text-xs flex items-center gap-1">
            <ShieldAlert size={12} />
            Read Only
          </span>
        )}
      </div>

      {/* Center Tabs & Console Button OR Staged Changes Controls */}
      <div className="flex items-center space-x-2">
        {stagedChangesCount > 0 ? (
          <div className="flex flex-col items-center justify-center animate-in fade-in py-0.5">
            <div className="flex items-center space-x-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/50 px-2 py-0.5 rounded-lg shadow-2xs">
              <button
                onClick={onDiscardChanges}
                disabled={savingChanges}
                className="text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white text-xs px-2 py-0.5 rounded hover:bg-amber-200/50 dark:hover:bg-amber-900/40 transition flex items-center gap-1 font-medium disabled:opacity-50"
                title="Discard all changes (Esc)"
              >
                <Undo2 size={12} />
                <span>Discard</span>
                <kbd className="hidden sm:inline-flex px-1 py-0.2 text-[9px] font-mono rounded bg-white dark:bg-zinc-800 border border-amber-300/80 dark:border-amber-700/80 text-amber-900 dark:text-amber-200">
                  Esc
                </kbd>
              </button>
              <div className="h-3 w-px bg-amber-300/80 dark:bg-amber-700/60" />
              <button
                onClick={onSaveChanges}
                disabled={savingChanges}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2.5 py-0.5 rounded font-medium transition flex items-center gap-1 shadow-xs disabled:opacity-50"
                title={`Save all changes (${isMac ? '⌘S' : 'Ctrl+S'})`}
              >
                <Save size={12} />
                <span>{savingChanges ? 'Saving...' : 'Save'}</span>
                <kbd className="hidden sm:inline-flex px-1 py-0.2 text-[9px] font-mono rounded bg-emerald-700 text-emerald-100 border border-emerald-500/40">
                  {isMac ? '⌘S' : 'Ctrl+S'}
                </kbd>
              </button>
            </div>
            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              <span>{stagedChangesCount} pending {stagedChangesCount === 1 ? 'change' : 'changes'}</span>
            </span>
          </div>
        ) : (
          <div className="flex items-center bg-slate-100/90 dark:bg-zinc-950/80 p-1 rounded-lg border border-slate-200 dark:border-zinc-800">
            <button
              onClick={() => setActiveTab('tables')}
              className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === 'tables'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <Database size={14} />
              <span>Tables</span>
            </button>
            <button
              onClick={() => setActiveTab('sql')}
              className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded-md transition-all ${
                activeTab === 'sql'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <Terminal size={14} />
              <span>SQL Runner</span>
            </button>
          </div>
        )}

        {onToggleConsole && (
          <button
            onClick={onToggleConsole}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded-lg border transition-all ${
              consoleOpen
                ? 'bg-red-600 text-white border-red-700 shadow-sm'
                : 'bg-slate-100/90 dark:bg-zinc-950/80 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
            }`}
            title={`Toggle Rails Console Terminal (${isMac ? '⌘`' : 'Ctrl+`'})`}
          >
            <Terminal size={13} className={consoleOpen ? 'text-white' : 'text-red-500'} />
            <span className="font-mono text-xs">Console</span>
            <kbd className={`hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono rounded border ${
              consoleOpen
                ? 'bg-red-700 border-red-500 text-white'
                : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400'
            }`}>
              {isMac ? '⌘`' : 'Ctrl+`'}
            </kbd>
          </button>
        )}
      </div>

      {/* Right Actions: Search, Shortcuts & Theme Toggle */}
      <div className="flex items-center space-x-2.5">
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            className="flex items-center justify-between w-44 sm:w-60 md:w-72 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100/80 dark:bg-zinc-950/80 text-slate-500 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700 hover:text-slate-800 dark:hover:text-zinc-200 transition-all shadow-xs"
            title={`Quick Search & Commands (${isMac ? '⌘K' : 'Ctrl+K'})`}
          >
            <div className="flex items-center space-x-2 truncate">
              <Search size={13} className="text-slate-400 dark:text-zinc-500 shrink-0" />
              <span className="truncate">Search tables, actions...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 shadow-xs shrink-0">
              {isMac ? '⌘K' : 'Ctrl+K'}
            </kbd>
          </button>
        )}

        {/* Shortcuts Cheat Sheet Button */}
        {onOpenShortcuts && (
          <button
            onClick={onOpenShortcuts}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-200/80 dark:hover:bg-zinc-800 transition-colors"
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
          >
            <Keyboard size={14} />
            <kbd className="hidden sm:inline-flex px-1.5 py-0.2 text-[9px] font-mono rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
              ?
            </kbd>
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-200/80 dark:hover:bg-zinc-800 transition-colors"
          title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark' ? (
            <Sun size={15} className="text-amber-400" />
          ) : (
            <Moon size={15} className="text-slate-600" />
          )}
        </button>
      </div>
    </header>
  );
};
