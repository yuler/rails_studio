import React, { useEffect, useState, useCallback } from 'react';
import { Save, Undo2 } from 'lucide-react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { TableView } from './components/TableView';
import { SqlRunner } from './components/SqlRunner';
import { ForeignKeyDrawer } from './components/ForeignKeyDrawer';
import { InsertModal } from './components/InsertModal';
import { RailsConsole } from './components/RailsConsole';
import { CommandPalette } from './components/CommandPalette';
import { ShortcutsModal } from './components/ShortcutsModal';
import {
  DatabaseInfo,
  TableMeta,
  TableSchema,
  FilterCondition,
  StagedChange
} from './types';
import {
  fetchOverview,
  fetchTableSchema,
  fetchRecords,
  saveBatch,
  createRecord,
  deleteRecord
} from './api';

export const App: React.FC = () => {
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseInfo | undefined>();
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tables' | 'sql'>('tables');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('rails_studio_sidebar_open');
      if (stored === '0') return false;
      if (stored === '1') return true;
    } catch {
      // ignore
    }
    return true;
  });

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('rails_studio_sidebar_open', next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const [schema, setSchema] = useState<TableSchema | null>(null);
  const [records, setRecords] = useState<Record<string, any>[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [page, setPage] = useState<number>(1);
  const [perPage, setPerPage] = useState<number>(50);
  const [sortBy, setSortBy] = useState<string | undefined>();
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<FilterCondition[]>([]);

  const [loadingOverview, setLoadingOverview] = useState<boolean>(true);
  const [loadingRecords, setLoadingRecords] = useState<boolean>(false);
  const [savingChanges, setSavingChanges] = useState<boolean>(false);

  // Staged changes: Map of key `${rowId}:${column}` => StagedChange
  const [stagedChanges, setStagedChanges] = useState<Map<string, StagedChange>>(new Map());

  // Foreign Key Drawer
  const [fkDrawer, setFkDrawer] = useState<{ table: string; id: any } | null>(null);

  // Insert Record Modal
  const [showInsertModal, setShowInsertModal] = useState<boolean>(false);

  // Command Palette & Shortcuts Modal
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState<boolean>(false);
  const [showFilterBar, setShowFilterBar] = useState<boolean>(false);

  // Rails Console State
  const [consoleOpen, setConsoleOpen] = useState<boolean>(false);
  const [consoleInitialCommand, setConsoleInitialCommand] = useState<string | undefined>();

  // Toast / notification banner
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 1. Initial Overview
  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const data = await fetchOverview();
      setDatabaseInfo(data.database);
      setTables(data.tables);
      if (!selectedTable && data.tables.length > 0) {
        setSelectedTable(data.tables[0].name);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to connect to database', 'error');
    } finally {
      setLoadingOverview(false);
    }
  }, [selectedTable]);

  useEffect(() => {
    loadOverview();
  }, []);

  // 2. Load Schema & Records when selected table changes
  const loadSchemaAndRecords = useCallback(
    async (tableName: string) => {
      setLoadingRecords(true);
      try {
        const schemaData = await fetchTableSchema(tableName);
        setSchema(schemaData);

        const recData = await fetchRecords(
          tableName,
          page,
          perPage,
          sortBy,
          sortOrder,
          filters
        );
        setRecords(recData.records);
        setTotalCount(recData.total_count);
      } catch (err: any) {
        showToast(err.message || 'Failed to fetch table records', 'error');
      } finally {
        setLoadingRecords(false);
      }
    },
    [page, perPage, sortBy, sortOrder, filters]
  );

  useEffect(() => {
    if (selectedTable && activeTab === 'tables') {
      loadSchemaAndRecords(selectedTable);
    }
  }, [selectedTable, activeTab, page, perPage, sortBy, sortOrder, filters, loadSchemaAndRecords]);

  // Handle table selection from sidebar
  const handleSelectTable = (tableName: string) => {
    if (tableName === selectedTable) return;
    if (stagedChanges.size > 0) {
      if (!confirm('You have unsaved changes in the current table. Discard them?')) {
        return;
      }
    }
    setStagedChanges(new Map());
    setSelectedTable(tableName);
    setPage(1);
    setSortBy(undefined);
    setFilters([]);
  };

  // Sorting
  const handleSortChange = (colName: string) => {
    if (sortBy === colName) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        // Reset sort
        setSortBy(undefined);
        setSortOrder('asc');
      }
    } else {
      setSortBy(colName);
      setSortOrder('asc');
    }
    setPage(1);
  };

  // Staged Cell Edit
  const handleStageCellChange = (rowId: any, column: string, originalVal: any, newVal: any) => {
    const key = `${rowId}:${column}`;
    const next = new Map(stagedChanges);

    // If new value is identical to original, remove from staging
    if (newVal === originalVal) {
      next.delete(key);
    } else {
      next.set(key, {
        rowId,
        column,
        originalValue: originalVal,
        newValue: newVal
      });
    }

    setStagedChanges(next);
  };

  // Discard all changes
  const handleDiscardChanges = () => {
    setStagedChanges(new Map());
    showToast('Changes discarded');
  };

  // Commit Staged Changes Batch
  const handleSaveChanges = async () => {
    if (!selectedTable || stagedChanges.size === 0) return;
    setSavingChanges(true);

    try {
      // Group updates by rowId
      const updatesMap = new Map<any, Record<string, any>>();
      stagedChanges.forEach(({ rowId, column, newValue }) => {
        const changes = updatesMap.get(rowId) || {};
        changes[column] = newValue;
        updatesMap.set(rowId, changes);
      });

      const updatesList = Array.from(updatesMap.entries()).map(([id, changes]) => ({
        id,
        changes
      }));

      await saveBatch(selectedTable, { updates: updatesList });
      showToast(`Saved ${stagedChanges.size} changes successfully!`);
      setStagedChanges(new Map());

      // Refresh records & schema
      loadSchemaAndRecords(selectedTable);
      loadOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to save changes', 'error');
    } finally {
      setSavingChanges(false);
    }
  };

  // Insert Record
  const handleCreateRecord = async (data: Record<string, any>) => {
    if (!selectedTable) return;
    await createRecord(selectedTable, data);
    showToast('Record created successfully!');
    loadSchemaAndRecords(selectedTable);
    loadOverview();
  };

  // Delete Selected Rows
  const handleDeleteSelectedRows = async (rowIds: any[]) => {
    if (!selectedTable) return false;
    if (!confirm(`Are you sure you want to delete ${rowIds.length} records? This action cannot be undone.`)) {
      return false;
    }

    try {
      await saveBatch(selectedTable, { deletes: rowIds });
      showToast(`Deleted ${rowIds.length} records`);
      loadSchemaAndRecords(selectedTable);
      loadOverview();
      return true;
    } catch (err: any) {
      showToast(err.message || 'Failed to delete records', 'error');
      return false;
    }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Cmd/Ctrl + K -> Toggle Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
        return;
      }

      // 2. Cmd/Ctrl + B -> Toggle sidebar / brand column
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // 3. Cmd/Ctrl + ` -> Toggle Rails Console
      if ((e.ctrlKey || e.metaKey) && (e.code === 'Backquote' || e.key === '`' || e.key === '~')) {
        e.preventDefault();
        setConsoleOpen((prev) => !prev);
        return;
      }

      // 3. Cmd/Ctrl + S -> Save pending changes (prevent browser save page dialog)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (stagedChanges.size > 0 && !savingChanges) {
          handleSaveChanges();
        }
        return;
      }

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping =
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target?.isContentEditable;

      // 4. Cmd/Ctrl + C -> Discard pending changes (copy still works while typing)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (!isTyping && stagedChanges.size > 0) {
          e.preventDefault();
          handleDiscardChanges();
        }
        return;
      }

      // 5. Escape -> close topmost open overlay
      if (e.key === 'Escape') {
        if (commandPaletteOpen) {
          e.preventDefault();
          setCommandPaletteOpen(false);
          return;
        }
        if (shortcutsModalOpen) {
          e.preventDefault();
          setShortcutsModalOpen(false);
          return;
        }
        if (showInsertModal) {
          e.preventDefault();
          setShowInsertModal(false);
          return;
        }
        if (fkDrawer) {
          e.preventDefault();
          setFkDrawer(null);
          return;
        }
        if (consoleOpen) {
          e.preventDefault();
          setConsoleOpen(false);
          return;
        }
      }

      // 6. Single key shortcuts (only if NOT in an input/textarea/select/editable element and no modals open)
      if (isTyping || commandPaletteOpen || shortcutsModalOpen || showInsertModal || fkDrawer) {
        return;
      }

      // '?' -> Open Shortcuts Modal
      if (e.key === '?') {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
        return;
      }

      // '1' / '2' -> Switch Tables / SQL Runner tabs
      if (e.key === '1' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setActiveTab('tables');
        return;
      }
      if (e.key === '2' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setActiveTab('sql');
        return;
      }

      // 'n' or 'N' -> New Record
      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) {
        if (selectedTable && activeTab === 'tables' && schema) {
          e.preventDefault();
          setShowInsertModal(true);
        }
        return;
      }

      // 'f' or 'F' -> Toggle Filters
      if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) {
        if (selectedTable && activeTab === 'tables') {
          e.preventDefault();
          setShowFilterBar((prev) => !prev);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [
    commandPaletteOpen,
    shortcutsModalOpen,
    showInsertModal,
    fkDrawer,
    consoleOpen,
    stagedChanges.size,
    savingChanges,
    selectedTable,
    activeTab,
    schema,
    handleSaveChanges,
    handleDiscardChanges,
    loadSchemaAndRecords,
    toggleSidebar
  ]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 antialiased font-sans">
      {/* Toast Banner */}
      {toast && (
        <div
          className={`fixed bottom-14 right-4 z-50 px-4 py-2 rounded-lg shadow-xl text-xs font-mono border transition-all animate-in slide-in-from-bottom-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/90 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <Header
        databaseInfo={databaseInfo}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
      />

      {/* Main Container — spacer below matches collapsed console height */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {activeTab === 'tables' ? (
          <>
            {sidebarOpen && (
              <Sidebar
                tables={tables}
                selectedTable={selectedTable}
                onSelectTable={handleSelectTable}
                loading={loadingOverview}
                onOpenCommandPalette={() => setCommandPaletteOpen(true)}
              />
            )}

            {schema && selectedTable ? (
              <TableView
                schema={schema}
                records={records}
                totalCount={totalCount}
                page={page}
                perPage={perPage}
                sortBy={sortBy}
                sortOrder={sortOrder}
                filters={filters}
                loading={loadingRecords}
                stagedChanges={stagedChanges}
                showFilterBar={showFilterBar}
                onToggleFilterBar={() => setShowFilterBar((prev) => !prev)}
                onPageChange={setPage}
                onPerPageChange={(newPerPage) => {
                  setPerPage(newPerPage);
                  setPage(1);
                }}
                onSortChange={handleSortChange}
                onFiltersChange={(newFilters) => {
                  setFilters(newFilters);
                  setPage(1);
                }}
                onRefresh={() => loadSchemaAndRecords(selectedTable)}
                onOpenInsertModal={() => setShowInsertModal(true)}
                onStageCellChange={handleStageCellChange}
                onDeleteSelectedRows={handleDeleteSelectedRows}
                onOpenForeignKey={(targetTable, targetId) =>
                  setFkDrawer({ table: targetTable, id: targetId })
                }
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 dark:text-zinc-500 font-mono text-xs">
                Select a table from the sidebar to inspect records
              </div>
            )}
          </>
        ) : (
          <SqlRunner
            tables={tables}
            onOpenConsole={(cmd) => {
              setConsoleInitialCommand(cmd);
              setConsoleOpen(true);
            }}
          />
        )}
      </div>
      <div className="h-9 shrink-0" aria-hidden />

      {/* Foreign Key Drawer */}
      {fkDrawer && (
        <ForeignKeyDrawer
          targetTable={fkDrawer.table}
          targetId={fkDrawer.id}
          onClose={() => setFkDrawer(null)}
          onNavigateToTable={(tbl) => {
            setFkDrawer(null);
            handleSelectTable(tbl);
          }}
          onSelectNestedFk={(tbl, id) => {
            setFkDrawer({ table: tbl, id });
          }}
        />
      )}

      {/* Insert Record Modal */}
      {showInsertModal && schema && (
        <InsertModal
          schema={schema}
          onClose={() => setShowInsertModal(false)}
          onSubmit={handleCreateRecord}
        />
      )}

      {stagedChanges.size > 0 && (
        <div className="fixed bottom-12 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white/95 dark:bg-zinc-900/95 shadow-lg backdrop-blur px-2 py-1.5">
            <div className="flex items-center gap-1.5 px-2 font-mono text-[11px] text-slate-600 dark:text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span>
                {stagedChanges.size} pending {stagedChanges.size === 1 ? 'change' : 'changes'}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-200 dark:bg-zinc-700" />
            <button
              onClick={handleDiscardChanges}
              disabled={savingChanges}
              className="text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white text-xs px-2 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 transition flex items-center gap-1.5 font-medium disabled:opacity-50"
              title="Discard all changes (Ctrl+C)"
            >
              <Undo2 size={13} />
              <span>Discard</span>
              <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400">
                Ctrl+C
              </kbd>
            </button>
            <button
              onClick={handleSaveChanges}
              disabled={savingChanges}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-2.5 py-1 rounded-md font-medium transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              title="Save all changes (Ctrl+S)"
            >
              <Save size={13} />
              <span>{savingChanges ? 'Saving...' : 'Save'}</span>
              <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-[9px] font-mono rounded bg-emerald-700 text-emerald-100 border border-emerald-500/40">
                Ctrl+S
              </kbd>
            </button>
          </div>
        </div>
      )}

      {/* Fixed Bottom Rails Console Web Terminal */}
      <RailsConsole
        isOpen={consoleOpen}
        onToggle={() => setConsoleOpen(!consoleOpen)}
        initialCommand={consoleInitialCommand}
        onClearInitialCommand={() => setConsoleInitialCommand(undefined)}
      />

      {/* Command Palette Modal (Ctrl+K or Cmd+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        tables={tables}
        selectedTable={selectedTable}
        onSelectTable={(tbl) => {
          handleSelectTable(tbl);
          setCommandPaletteOpen(false);
        }}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setCommandPaletteOpen(false);
        }}
        onToggleConsole={() => {
          setConsoleOpen((prev) => !prev);
          setCommandPaletteOpen(false);
        }}
        onToggleSidebar={() => {
          toggleSidebar();
          setCommandPaletteOpen(false);
        }}
        onOpenInsertModal={() => {
          setShowInsertModal(true);
          setCommandPaletteOpen(false);
        }}
        onRefreshTable={() => {
          if (selectedTable) loadSchemaAndRecords(selectedTable);
          setCommandPaletteOpen(false);
        }}
        onToggleFilterBar={() => {
          setShowFilterBar((prev) => !prev);
          setCommandPaletteOpen(false);
        }}
        onSaveChanges={handleSaveChanges}
        onDiscardChanges={handleDiscardChanges}
        stagedChangesCount={stagedChanges.size}
        onOpenShortcutsHelp={() => {
          setShortcutsModalOpen(true);
          setCommandPaletteOpen(false);
        }}
      />

      {/* Shortcuts Cheat Sheet Modal */}
      <ShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </div>
  );
};
