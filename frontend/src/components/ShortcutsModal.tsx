import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutItem[];
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: 'Global & Navigation',
      items: [
        { keys: [modKey, 'K'], description: 'Open Command Palette / Quick Search' },
        { keys: [modKey, 'B'], description: 'Toggle sidebar / brand column' },
        { keys: [modKey, '['], description: 'Switch to Tables browser' },
        { keys: [modKey, ']'], description: 'Switch to SQL Runner and focus editor' },
        { keys: ['/'], description: 'Focus and filter tables in sidebar' },
        { keys: ['↑', '↓'], description: 'Move highlight in the sidebar table list' },
        { keys: ['Enter'], description: 'Open the highlighted sidebar table' },
        { keys: ['Tab'], description: 'Switch focus between sidebar and table' },
        { keys: ['←', '→'], description: 'Focus sidebar (←) or table (→)' },
        { keys: [modKey, '`'], description: 'Toggle Rails Console Web Terminal' },
        { keys: [modKey, 'S'], description: 'Save pending cell edits to database' },
        { keys: [modKey, 'C'], description: 'Discard pending cell edits' },
        { keys: ['T'], description: 'Toggle light / dark theme' },
        { keys: ['?'], description: 'Open this Keyboard Shortcuts cheat sheet' },
        { keys: ['Esc'], description: 'Close any active modal, drawer, or search panel' }
      ]
    },
    {
      title: 'Table Data Browser',
      items: [
        { keys: ['↑', '↓'], description: 'Move highlight on table rows (click table first)' },
        { keys: ['Space'], description: 'Toggle checkbox on the focused row' },
        { keys: ['N'], description: 'Add a new row / record to current table' },
        { keys: ['D'], description: 'Delete selected rows' },
        { keys: ['R'], description: 'Refresh current table schema and records' },
        { keys: ['F'], description: 'Toggle column filter bar' },
        { keys: ['Double Click'], description: 'Edit cell value inline' },
        { keys: ['Enter'], description: 'Commit cell edit value' }
      ]
    },
    {
      title: 'Rails Console & SQL Runner',
      items: [
        { keys: ['Tab'], description: 'Switch between SQL editor and results' },
        { keys: ['Esc'], description: 'Leave the SQL editor' },
        { keys: [modKey, 'Enter'], description: 'Run query (also works while typing)' },
        { keys: ['Ctrl', 'Alt', 'N'], description: 'New SQL query tab' },
        { keys: ['Ctrl', 'Alt', 'F'], description: 'Format / prettify SQL' },
        { keys: [modKey, 'S'], description: 'Save current SQL to Stars (name it for search)' },
        { keys: ['Ctrl', 'Alt', 'S'], description: 'Open starred SQL queries' },
        { keys: ['Ctrl', '\\'], description: 'Toggle editor / results split layout' },
        { keys: ['Ctrl', 'Alt', 'X'], description: 'Clear SQL editor' },
        { keys: ['↑', '↓'], description: 'Move highlight on result rows (or console history)' },
        { keys: ['Space'], description: 'Toggle checkbox on the focused result row' },
        { keys: ['Tab'], description: 'Console: accept autocomplete suggestion' }
      ]
    }
  ];

  const renderGroup = (group: ShortcutGroup) => (
    <div key={group.title} className="space-y-2">
      <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
        {group.title}
      </h4>
      <div className="rounded-lg border border-slate-200 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-800/60 overflow-hidden bg-slate-50/50 dark:bg-zinc-950/40">
        {group.items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-3 px-3.5 py-2 text-xs"
          >
            <span className="text-slate-700 dark:text-zinc-300 font-sans min-w-0 pr-1">
              {item.description}
            </span>
            <div className="flex items-center space-x-1 shrink-0">
              {item.keys.map((k, ki) => (
                <kbd
                  key={ki}
                  className="px-2 py-0.5 text-[11px] font-mono font-medium rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 shadow-xs"
                >
                  {k}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center space-x-2">
            <Keyboard size={18} className="text-slate-700 dark:text-zinc-300" />
            <h3 className="font-semibold text-slate-900 dark:text-zinc-100 text-sm">
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[75vh] grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
          <div className="space-y-2 min-w-0">
            {renderGroup(shortcutGroups[0])}
          </div>
          <div className="space-y-5 min-w-0">
            {renderGroup(shortcutGroups[1])}
            {renderGroup(shortcutGroups[2])}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-zinc-950/80 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-400 dark:text-zinc-500 font-mono text-[11px]">
          <span>Tip: Press <kbd className="px-1 py-0.5 rounded border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400">?</kbd> anywhere to toggle this guide</span>
          <button
            onClick={onClose}
            className="px-2.5 py-1 rounded bg-slate-200/70 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
