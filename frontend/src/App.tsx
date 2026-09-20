import React, { useEffect, useState, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { TableView } from './components/TableView';
import { SqlRunner } from './components/SqlRunner';
import { ForeignKeyDrawer } from './components/ForeignKeyDrawer';
import { InsertModal } from './components/InsertModal';
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
    if (!selectedTable) return;
    if (!confirm(`Are you sure you want to delete ${rowIds.length} records? This action cannot be undone.`)) {
      return;
    }

    try {
      await saveBatch(selectedTable, { deletes: rowIds });
      showToast(`Deleted ${rowIds.length} records`);
      loadSchemaAndRecords(selectedTable);
      loadOverview();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete records', 'error');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100 antialiased font-sans">
      {/* Toast Banner */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-xl text-xs font-mono border transition-all animate-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
              : 'bg-red-950/90 border-red-800 text-red-200'
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
        stagedChangesCount={stagedChanges.size}
        onSaveChanges={handleSaveChanges}
        onDiscardChanges={handleDiscardChanges}
        savingChanges={savingChanges}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'tables' ? (
          <>
            <Sidebar
              tables={tables}
              selectedTable={selectedTable}
              onSelectTable={handleSelectTable}
              loading={loadingOverview}
            />

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
              <div className="flex-1 flex items-center justify-center text-zinc-500 font-mono text-xs">
                Select a table from the sidebar to inspect records
              </div>
            )}
          </>
        ) : (
          <SqlRunner tables={tables} />
        )}
      </div>

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
    </div>
  );
};
