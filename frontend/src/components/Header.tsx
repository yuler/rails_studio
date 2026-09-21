import React from 'react';
import { Database, Terminal, ShieldAlert, Sun, Moon, Search, Keyboard, PanelLeftClose, PanelLeft } from 'lucide-react';
import { DatabaseInfo } from '../types';
import { useTheme } from '../theme';
import { Logo } from './Logo';

export const SIDEBAR_WIDTH_CLASS = 'w-64';

interface HeaderProps {
  databaseInfo?: DatabaseInfo;
  activeTab: 'tables' | 'sql';
  setActiveTab: (tab: 'tables' | 'sql') => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenCommandPalette?: () => void;
  onOpenShortcuts?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  databaseInfo,
  activeTab,
  setActiveTab,
  sidebarOpen,
  onToggleSidebar,
  onOpenCommandPalette,
  onOpenShortcuts
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const sidebarShortcut = isMac ? '⌘B' : 'Ctrl+B';

  return (
    <header className="min-h-14 overflow-visible border-b border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 backdrop-blur flex items-stretch select-none z-20 shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-none transition-colors">
      <div
        className={`${sidebarOpen ? SIDEBAR_WIDTH_CLASS : 'w-12'} shrink-0 border-r border-slate-200 dark:border-zinc-800 px-2.5 py-2 flex flex-col justify-center gap-1 transition-[width] duration-150`}
      >
        {sidebarOpen ? (
          <>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center space-x-2 min-w-0">
                <Logo size={24} />
                <span className="font-bold text-slate-900 dark:text-zinc-100 tracking-tight text-sm font-mono truncate">
                  Rails<span className="text-red-500">Studio</span>
                </span>
              </div>
              <button
                onClick={onToggleSidebar}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                title={`Collapse sidebar (${sidebarShortcut})`}
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose size={14} />
              </button>
            </div>

            {databaseInfo && (
              <div className="flex items-center gap-1.5 min-w-0 pl-[1px]">
                <span className="px-1.5 py-px rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-mono flex items-center gap-1 border border-slate-200 dark:border-zinc-700/50 text-[10px]">
                  <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                  {databaseInfo.adapter}
                </span>
                {databaseInfo.rails_version && (
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono truncate">
                    Rails {databaseInfo.rails_version}
                  </span>
                )}
                {databaseInfo.read_only && (
                  <span className="px-1.5 py-px rounded bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50 text-[10px] flex items-center gap-0.5">
                    <ShieldAlert size={10} />
                  </span>
                )}
              </div>
            )}
          </>
        ) : (
          <button
            onClick={onToggleSidebar}
            className="flex flex-col items-center justify-center gap-1.5 h-full text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200"
            title={`Expand sidebar (${sidebarShortcut})`}
            aria-label="Expand sidebar"
          >
            <Logo size={22} />
            <PanelLeft size={13} />
          </button>
        )}
      </div>

      <div className="flex-1 min-w-0 px-3 flex items-center justify-between gap-3">
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
            <kbd className="hidden sm:inline-flex px-1 py-0.5 text-[9px] font-mono rounded border border-slate-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 text-slate-400 dark:text-zinc-500">
              1
            </kbd>
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
            <kbd className="hidden sm:inline-flex px-1 py-0.5 text-[9px] font-mono rounded border border-slate-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900 text-slate-400 dark:text-zinc-500">
              2
            </kbd>
          </button>
        </div>

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
      </div>
    </header>
  );
};
