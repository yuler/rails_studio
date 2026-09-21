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
  const tablesShortcut = isMac ? '⌘[' : 'Ctrl+[';
  const sqlShortcut = isMac ? '⌘]' : 'Ctrl+]';
  const headerBtn =
    'h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-200/80 dark:hover:bg-zinc-800 transition-colors';
  const headerKbd =
    'hidden sm:inline-flex px-1.5 py-0.5 text-[9px] font-mono rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-500 dark:text-zinc-400';

  return (
    <header className="min-h-14 overflow-visible border-b border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 backdrop-blur flex items-stretch select-none z-20 shadow-[0_1px_2px_rgba(0,0,0,0.03)] dark:shadow-none transition-colors">
      <div
        className={`${sidebarOpen ? SIDEBAR_WIDTH_CLASS : 'w-12'} shrink-0 border-r border-slate-200 dark:border-zinc-800 px-2.5 py-2 flex flex-col justify-center gap-1 transition-[width] duration-150`}
      >
        {sidebarOpen ? (
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <Logo size={40} />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-bold text-slate-900 dark:text-zinc-100 tracking-tight text-sm font-mono truncate">
                  Rails<span className="text-red-500">Studio</span>
                </span>
                {databaseInfo && (
                  <div className="flex items-center gap-1.5 min-w-0">
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
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Logo size={32} />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 px-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleSidebar}
            className={headerBtn}
            title={`${sidebarOpen ? 'Collapse' : 'Expand'} sidebar (${sidebarShortcut})`}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
            <kbd className={headerKbd}>{sidebarShortcut}</kbd>
          </button>

          <div className="h-8 flex items-center bg-slate-100/90 dark:bg-zinc-950/80 p-0.5 rounded-lg border border-slate-200 dark:border-zinc-800">
            <button
              onClick={() => setActiveTab('tables')}
              title={`Tables (${tablesShortcut})`}
              className={`h-full inline-flex items-center gap-1.5 px-2.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'tables'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <Database size={14} />
              <span>Tables</span>
              <kbd className={headerKbd}>{tablesShortcut}</kbd>
            </button>
            <button
              onClick={() => setActiveTab('sql')}
              title={`SQL Runner (${sqlShortcut})`}
              className={`h-full inline-flex items-center gap-1.5 px-2.5 text-xs font-medium rounded-md transition-all ${
                activeTab === 'sql'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-sm'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <Terminal size={14} />
              <span>SQL Runner</span>
              <kbd className={headerKbd}>{sqlShortcut}</kbd>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className={`${headerBtn} w-40 justify-between px-2.5 text-xs`}
              title={`Quick Search & Commands (${isMac ? '⌘K' : 'Ctrl+K'})`}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <Search size={13} className="text-slate-400 dark:text-zinc-500 shrink-0" />
                <span className="truncate">Search...</span>
              </span>
              <kbd className={`${headerKbd} shrink-0`}>{isMac ? '⌘K' : 'Ctrl+K'}</kbd>
            </button>
          )}

          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              className={headerBtn}
              title="Keyboard shortcuts (?)"
              aria-label="Keyboard shortcuts"
            >
              <Keyboard size={14} />
              <kbd className={headerKbd}>?</kbd>
            </button>
          )}

          <button
            data-theme-toggle
            onClick={toggleTheme}
            className={headerBtn}
            title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode (T)`}
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? (
              <Sun size={15} className="text-amber-400" />
            ) : (
              <Moon size={15} className="text-slate-600" />
            )}
            <kbd className={headerKbd}>T</kbd>
          </button>
        </div>
      </div>
    </header>
  );
};
