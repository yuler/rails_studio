import React from 'react';
import { Database, Terminal, Save, Undo2, ShieldAlert, Sparkles } from 'lucide-react';
import { DatabaseInfo } from '../types';

interface HeaderProps {
  databaseInfo?: DatabaseInfo;
  activeTab: 'tables' | 'sql';
  setActiveTab: (tab: 'tables' | 'sql') => void;
  stagedChangesCount: number;
  onSaveChanges: () => void;
  onDiscardChanges: () => void;
  savingChanges: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  databaseInfo,
  activeTab,
  setActiveTab,
  stagedChangesCount,
  onSaveChanges,
  onDiscardChanges,
  savingChanges
}) => {
  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur px-4 flex items-center justify-between select-none z-20">
      {/* Brand & Stats */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <span className="text-xl">💎</span>
          <span className="font-bold text-zinc-100 tracking-tight text-base font-mono">
            Rails<span className="text-red-500">Studio</span>
          </span>
        </div>

        {databaseInfo && (
          <div className="flex items-center space-x-2 pl-3 border-l border-zinc-800 text-xs">
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono flex items-center gap-1.5 border border-zinc-700/50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {databaseInfo.adapter}
            </span>
            <span className="text-zinc-500 font-mono hidden sm:inline-block">
              {databaseInfo.database_name}
            </span>
            <span className="text-zinc-600 hidden md:inline-block">•</span>
            <span className="text-zinc-500 font-mono text-[11px] hidden md:inline-block">
              Rails {databaseInfo.rails_version}
            </span>
          </div>
        )}

        {databaseInfo?.read_only && (
          <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-700/50 text-xs flex items-center gap-1">
            <ShieldAlert size={12} />
            Read Only
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-zinc-950/80 p-1 rounded-lg border border-zinc-800">
        <button
          onClick={() => setActiveTab('tables')}
          className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'tables'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Database size={14} />
          <span>Tables</span>
        </button>
        <button
          onClick={() => setActiveTab('sql')}
          className={`flex items-center space-x-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'sql'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Terminal size={14} />
          <span>SQL Runner</span>
        </button>
      </div>

      {/* Staged Changes Actions */}
      <div className="flex items-center space-x-2">
        {stagedChangesCount > 0 ? (
          <div className="flex items-center space-x-2 bg-amber-950/40 border border-amber-700/50 px-3 py-1 rounded-md animate-in fade-in">
            <span className="text-xs text-amber-300 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              {stagedChangesCount} pending {stagedChangesCount === 1 ? 'change' : 'changes'}
            </span>
            <button
              onClick={onDiscardChanges}
              disabled={savingChanges}
              className="text-zinc-400 hover:text-zinc-200 text-xs px-2 py-1 rounded hover:bg-zinc-800 transition flex items-center gap-1"
              title="Discard all changes"
            >
              <Undo2 size={13} />
              Discard
            </button>
            <button
              onClick={onSaveChanges}
              disabled={savingChanges}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1 rounded font-medium transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Save size={13} />
              {savingChanges ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        ) : (
          <div className="text-xs text-zinc-500 flex items-center gap-1.5 font-mono">
            <Sparkles size={13} className="text-zinc-600" />
            <span>Synced</span>
          </div>
        )}
      </div>
    </header>
  );
};
