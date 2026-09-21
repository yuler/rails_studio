import {
  DatabaseInfo,
  TableMeta,
  TableSchema,
  QueryRecordsResponse,
  FilterCondition,
  QueryResult,
  ConsoleExecuteResponse,
  ConsoleCompletionsResponse
} from './types';

function getApiBase(): string {
  const config = (window as any).__RAILS_STUDIO_CONFIG__;
  if (config && config.apiBase) {
    return config.apiBase;
  }
  return '/rails_studio/api';
}

export function getConfig() {
  return (window as any).__RAILS_STUDIO_CONFIG__ || {
    basePath: '/rails_studio',
    apiBase: '/rails_studio/api',
    railsVersion: '8.1',
    rubyVersion: '3.4',
    environment: 'development',
    readOnly: false
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${getApiBase()}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data.error || (data.errors ? data.errors.join(', ') : `HTTP error ${response.status}`);
    throw new Error(message);
  }

  return data as T;
}

export async function fetchOverview(): Promise<{ database: DatabaseInfo; tables: TableMeta[]; total_tables: number }> {
  return request('/overview');
}

export async function fetchTableSchema(tableName: string): Promise<TableSchema> {
  return request(`/tables/${encodeURIComponent(tableName)}/schema`);
}

export async function fetchRecords(
  tableName: string,
  page = 1,
  perPage = 50,
  sortBy?: string,
  sortOrder = 'asc',
  filters: FilterCondition[] = []
): Promise<QueryRecordsResponse> {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('per_page', String(perPage));
  if (sortBy) {
    params.set('sort_by', sortBy);
    params.set('sort_order', sortOrder);
  }
  if (filters.length > 0) {
    const cleanFilters = filters.map(({ column, op, value }) => ({ column, op, value }));
    params.set('filters', JSON.stringify(cleanFilters));
  }

  return request(`/tables/${encodeURIComponent(tableName)}/records?${params.toString()}`);
}

export async function fetchRecordById(tableName: string, id: any): Promise<{ record: Record<string, any> }> {
  return request(`/tables/${encodeURIComponent(tableName)}/records/${encodeURIComponent(String(id))}`);
}

export async function createRecord(tableName: string, record: Record<string, any>): Promise<{ success: boolean; record: Record<string, any> }> {
  return request(`/tables/${encodeURIComponent(tableName)}/records`, {
    method: 'POST',
    body: JSON.stringify({ record })
  });
}

export async function updateRecord(tableName: string, id: any, record: Record<string, any>): Promise<{ success: boolean; record: Record<string, any> }> {
  return request(`/tables/${encodeURIComponent(tableName)}/records/${encodeURIComponent(String(id))}`, {
    method: 'PATCH',
    body: JSON.stringify({ record })
  });
}

export async function deleteRecord(tableName: string, id: any): Promise<{ success: boolean }> {
  return request(`/tables/${encodeURIComponent(tableName)}/records/${encodeURIComponent(String(id))}`, {
    method: 'DELETE'
  });
}

export async function saveBatch(
  tableName: string,
  payload: {
    updates?: { id: any; changes: Record<string, any> }[];
    creates?: Record<string, any>[];
    deletes?: any[];
  }
): Promise<{ success: boolean; results: { updated: number; created: number; deleted: number } }> {
  return request(`/tables/${encodeURIComponent(tableName)}/records/batch`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function executeQuery(sql: string): Promise<QueryResult> {
  return request('/query', {
    method: 'POST',
    body: JSON.stringify({ sql })
  });
}

export async function executeConsole(command: string): Promise<ConsoleExecuteResponse> {
  return request('/console/execute', {
    method: 'POST',
    body: JSON.stringify({ command })
  });
}

export async function fetchConsoleCompletions(): Promise<ConsoleCompletionsResponse> {
  return request('/console/completions');
}
