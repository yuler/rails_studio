import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  Trash2,
  Send,
  CornerDownLeft,
  Sparkles,
  Database,
  Check,
  AlertCircle
} from 'lucide-react';
import { executeConsole, fetchConsoleCompletions, getConfig } from '../api';
import { ConsoleExecuteResponse, ConsoleModelMeta } from '../types';

interface ConsoleHistoryItem {
  id: string;
  command: string;
  response?: ConsoleExecuteResponse;
  timestamp: string;
  running?: boolean;
}

interface RailsConsoleProps {
  isOpen: boolean;
  onToggle: () => void;
  initialCommand?: string;
  onClearInitialCommand?: () => void;
}

export const RailsConsole: React.FC<RailsConsoleProps> = ({
  isOpen,
  onToggle,
  initialCommand,
  onClearInitialCommand
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ConsoleHistoryItem[]>([
    {
      id: 'welcome',
      command: 'Rails.env',
      response: {
        result: `"development"`,
        result_type: 'String',
        duration_ms: 0.8
      },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // History navigation (Up / Down)
  const [commandHistory, setCommandHistory] = useState<string[]>(['User.all', 'Rails.env']);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Suggestions state
  const [models, setModels] = useState<ConsoleModelMeta[]>([]);
  const [commonMethods, setCommonMethods] = useState<string[]>([]);
  const [globals, setGlobals] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<{ label: string; detail: string; type: 'model' | 'method' | 'column' | 'global' }[]>([]);
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const config = getConfig();

  // Load completions on mount
  useEffect(() => {
    async function loadCompletions() {
      try {
        const data = await fetchConsoleCompletions();
        setModels(data.models || []);
        setCommonMethods(data.common_methods || []);
        setGlobals(data.globals || []);
      } catch {
        // ignore fallback
      }
    }
    loadCompletions();
  }, []);

  // Handle external command injection (e.g. from SQL Runner)
  useEffect(() => {
    if (initialCommand) {
      if (!isOpen) onToggle();
      setInput(initialCommand);
      onClearInitialCommand?.();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [initialCommand, isOpen, onToggle, onClearInitialCommand]);

  // Scroll to bottom when history updates
  useEffect(() => {
    if (isOpen) {
      terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Compute suggestions on input change
  useEffect(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setShowSuggestions(false);
      return;
    }

    const items: { label: string; detail: string; type: 'model' | 'method' | 'column' | 'global' }[] = [];

    // Check if input is like "User." or "Article.where(..."
    const dotIndex = trimmed.lastIndexOf('.');
    if (dotIndex !== -1) {
      const leftPart = trimmed.substring(0, dotIndex).trim();
      const queryPart = trimmed.substring(dotIndex + 1).toLowerCase();

      // Find matching model
      const matchedModel = models.find((m) => m.name.toLowerCase() === leftPart.toLowerCase());
      if (matchedModel) {
        // Model columns
        matchedModel.columns.forEach((col) => {
          if (col.toLowerCase().startsWith(queryPart)) {
            items.push({ label: col, detail: `column in ${matchedModel.name}`, type: 'column' });
          }
        });
        // Model associations
        matchedModel.associations.forEach((assoc) => {
          if (assoc.toLowerCase().startsWith(queryPart)) {
            items.push({ label: assoc, detail: `association in ${matchedModel.name}`, type: 'method' });
          }
        });
      }

      // Common ActiveRecord methods
      commonMethods.forEach((method) => {
        if (method.toLowerCase().startsWith(queryPart)) {
          items.push({ label: method, detail: 'ActiveRecord query method', type: 'method' });
        }
      });
    } else {
      const queryPart = trimmed.toLowerCase();

      // Suggest Models
      models.forEach((m) => {
        if (m.name.toLowerCase().startsWith(queryPart)) {
          items.push({ label: m.name, detail: `table: ${m.table_name}`, type: 'model' });
        }
      });

      // Suggest Globals
      globals.forEach((g) => {
        if (g.toLowerCase().startsWith(queryPart)) {
          items.push({ label: g, detail: 'Rails global', type: 'global' });
        }
      });

      // Also suggest quick methods
      commonMethods.slice(0, 5).forEach((method) => {
        if (method.toLowerCase().startsWith(queryPart)) {
          items.push({ label: method, detail: 'method', type: 'method' });
        }
      });
    }

    if (items.length > 0) {
      setSuggestions(items.slice(0, 8));
      setSelectedSuggestionIdx(0);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [input, models, commonMethods, globals]);

  const applySuggestion = (item: { label: string }) => {
    const dotIndex = input.lastIndexOf('.');
    if (dotIndex !== -1) {
      setInput(input.substring(0, dotIndex + 1) + item.label);
    } else {
      setInput(item.label);
    }
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cmd = input.trim();
    if (!cmd) return;

    setShowSuggestions(false);
    setInput('');
    setHistoryIndex(-1);

    // Add to command history
    setCommandHistory((prev) => [cmd, ...prev.filter((c) => c !== cmd)]);

    const itemKey = String(Date.now());
    const newItem: ConsoleHistoryItem = {
      id: itemKey,
      command: cmd,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      running: true
    };

    setHistory((prev) => [...prev, newItem]);

    try {
      const res = await executeConsole(cmd);
      setHistory((prev) =>
        prev.map((item) => (item.id === itemKey ? { ...item, response: res, running: false } : item))
      );
    } catch (err: any) {
      setHistory((prev) =>
        prev.map((item) =>
          item.id === itemKey
            ? {
                ...item,
                response: {
                  error: {
                    class: 'NetworkError',
                    message: err.message || 'Failed to reach console server'
                  }
                },
                running: false
              }
            : item
        )
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Autocomplete navigation
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIdx((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIdx((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault();
        applySuggestion(suggestions[selectedSuggestionIdx]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      onToggle();
      return;
    }

    // Command History navigation
    if (e.key === 'ArrowUp') {
      if (historyIndex < commandHistory.length - 1) {
        const nextIdx = historyIndex + 1;
        setHistoryIndex(nextIdx);
        setInput(commandHistory[nextIdx] || '');
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInput(commandHistory[nextIdx] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
      return;
    }
  };

  // Syntax highlighting helper for Ruby outputs
  const formatRubyOutput = (text: string) => {
    if (!text) return text;

    // Highlight strings
    const formatted = text.split('\n').map((line, idx) => {
      return (
        <div key={idx} className="leading-relaxed">
          {line}
        </div>
      );
    });

    return formatted;
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-200 border-t ${
        isOpen
          ? isExpanded
            ? 'h-[75vh]'
            : 'h-80'
          : 'h-9'
      } bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-100 shadow-2xl flex flex-col font-mono select-none`}
    >
      {/* Top Header Bar */}
      <div
        onClick={() => !isOpen && onToggle()}
        className="h-9 px-3.5 bg-slate-100/90 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between cursor-pointer select-none text-xs hover:bg-slate-200/70 dark:hover:bg-zinc-800/80 transition-colors"
      >
        <div className="flex items-center space-x-2.5">
          <TerminalIcon size={14} className="text-red-500 animate-pulse" />
          <span className="font-semibold text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
            Rails <span className="text-red-500 font-bold">Console</span>
          </span>

          <span className="text-slate-300 dark:text-zinc-600 text-[11px] hidden sm:inline-block">•</span>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-normal hidden sm:inline-block">
            {config.environment} ({config.railsVersion ? `Rails ${config.railsVersion}` : 'ActiveRecord'})
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
          {isOpen && (
            <>
              {/* Quick Preset Chips */}
              <div className="hidden md:flex items-center space-x-1 mr-2 text-[10px]">
                <span className="text-slate-400 dark:text-zinc-500">Quick:</span>
                {models.slice(0, 3).map((m) => (
                  <button
                    key={m.name}
                    onClick={() => setInput(`${m.name}.all`)}
                    className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition"
                  >
                    {m.name}.all
                  </button>
                ))}
                {models[0] && (
                  <button
                    onClick={() => setInput(`${models[0].name}.count`)}
                    className="px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 transition"
                  >
                    {models[0].name}.count
                  </button>
                )}
              </div>

              <button
                onClick={() => setHistory([])}
                className="p-1 rounded text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200/70 dark:hover:bg-zinc-800 transition"
                title="Clear console output"
              >
                <Trash2 size={13} />
              </button>

              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 rounded text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200/70 dark:hover:bg-zinc-800 transition"
                title={isExpanded ? 'Restore size' : 'Maximize terminal'}
              >
                {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            </>
          )}

          <button
            onClick={onToggle}
            className="p-1 rounded text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-200/70 dark:hover:bg-zinc-800 transition"
            title={isOpen ? 'Collapse console' : 'Open console'}
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      {isOpen && (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 dark:bg-zinc-950 text-xs">
          {/* Scrollable Logs Output */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 font-mono select-text">
            {history.map((item) => {
              const res = item.response;
              const hasError = Boolean(res?.error);

              return (
                <div key={item.id} className="space-y-1 group">
                  {/* Command line */}
                  <div className="flex items-center space-x-2 text-slate-800 dark:text-zinc-200">
                    <span className="text-red-500 font-bold select-none">&gt;&gt;</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{item.command}</span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition select-none">
                      {item.timestamp}
                    </span>
                  </div>

                  {/* Loading state */}
                  {item.running && (
                    <div className="flex items-center space-x-2 pl-4 text-slate-500 dark:text-zinc-400 text-[11px] animate-pulse">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></div>
                      <span>Executing in Rails environment...</span>
                    </div>
                  )}

                  {/* Captured SQL Queries */}
                  {res?.queries && res.queries.length > 0 && (
                    <div className="pl-4 space-y-1 my-1">
                      {res.queries.map((q, qIdx) => (
                        <div
                          key={qIdx}
                          className="text-[11px] bg-slate-100/80 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800/80 rounded px-2 py-1 text-slate-700 dark:text-zinc-300 flex items-baseline gap-1.5"
                        >
                          <span className="text-slate-400 dark:text-zinc-600 select-none">↳</span>
                          <span className="font-semibold text-[10px] text-slate-500 dark:text-zinc-400 shrink-0">
                            SQL ({q.duration_ms}ms):
                          </span>
                          <span className="font-mono text-slate-800 dark:text-zinc-200">{q.sql}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Captured Stdout (e.g. puts) */}
                  {res?.stdout && res.stdout.trim() !== '' && (
                    <div className="pl-4 py-1 text-slate-700 dark:text-zinc-300 text-[11px] whitespace-pre-wrap bg-slate-100 dark:bg-zinc-900/40 rounded px-2 border-l-2 border-slate-300 dark:border-zinc-700">
                      {res.stdout}
                    </div>
                  )}

                  {/* Result or Error */}
                  {hasError ? (
                    <div className="pl-4 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded p-2 text-[11px]">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle size={13} className="shrink-0 text-rose-600 dark:text-rose-400" />
                        <span>{res!.error!.class}:</span>
                        <span>{res!.error!.message}</span>
                      </div>
                      {res!.error!.backtrace && res!.error!.backtrace.length > 0 && (
                        <div className="mt-1 text-[10px] text-rose-600/80 dark:text-rose-400/80 space-y-0.5">
                          {res!.error!.backtrace.map((b, bIdx) => (
                            <div key={bIdx}>at {b}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : res && res.result !== undefined ? (
                    <div className="pl-4 flex items-baseline space-x-2">
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold select-none">=&gt;</span>
                      <div className="flex-1 text-emerald-800 dark:text-emerald-300 whitespace-pre-wrap break-all font-mono text-[11px]">
                        {formatRubyOutput(res.result || 'nil')}
                      </div>
                      {res.duration_ms !== undefined && (
                        <span className="text-[10px] text-slate-400 dark:text-zinc-600 select-none shrink-0">
                          {res.duration_ms}ms
                        </span>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
            <div ref={terminalEndRef} />
          </div>

          {/* Autocomplete Popup */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute bottom-11 left-4 max-w-sm w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-2xl overflow-hidden z-50 text-xs animate-in slide-in-from-bottom-2 duration-100">
              <div className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-[10px] font-semibold text-slate-500 dark:text-zinc-400 flex items-center justify-between border-b border-slate-200 dark:border-zinc-700">
                <span>Suggestions (Tab ⇥ to select)</span>
                <span>{suggestions.length} items</span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/60">
                {suggestions.map((item, idx) => (
                  <button
                    key={item.label}
                    onClick={() => applySuggestion(item)}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between text-xs transition ${
                      idx === selectedSuggestionIdx
                        ? 'bg-red-500/10 text-red-700 dark:text-white font-medium border-l-2 border-red-500'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-zinc-800/60'
                    }`}
                  >
                    <span className="font-mono text-red-600 dark:text-red-400 font-semibold">{item.label}</span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500">{item.detail}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Terminal Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="h-10 px-3 border-t border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/90 flex items-center space-x-2"
          >
            <span className="text-red-500 font-bold select-none">&gt;&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type Ruby / Active Record code... (e.g. User.all, User.count, Article.first)"
              className="flex-1 bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 font-mono focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition disabled:opacity-30 flex items-center gap-1 shadow-sm"
            >
              <Send size={11} />
              <span className="text-[11px] hidden sm:inline">Eval</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
