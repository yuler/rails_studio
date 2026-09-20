export interface DatabaseInfo {
  adapter: string;
  database_name: string;
  rails_version: string;
  ruby_version: string;
  read_only: boolean;
}

export interface TableMeta {
  name: string;
  row_count: number;
  columns_count: number;
  primary_keys: string[];
  foreign_keys_count: number;
}

export interface ForeignKeyInfo {
  column: string;
  to_table: string;
  primary_key: string;
  name?: string;
  inferred?: boolean;
}

export interface ColumnMeta {
  name: string;
  type: string;
  sql_type: string;
  null: boolean;
  default: any;
  comment?: string | null;
  primary: boolean;
  foreign_key?: ForeignKeyInfo | null;
  enum_values?: string[] | null;
}

export interface AssociationMeta {
  name: string;
  macro: string;
  foreign_key: string;
  target_table: string;
  polymorphic?: boolean | null;
}

export interface IndexMeta {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface TableSchema {
  table_name: string;
  primary_keys: string[];
  columns: ColumnMeta[];
  foreign_keys: ForeignKeyInfo[];
  associations: AssociationMeta[];
  indexes: IndexMeta[];
  row_count: number;
}

export interface QueryRecordsResponse {
  records: Record<string, any>[];
  total_count: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface FilterCondition {
  id: string;
  column: string;
  op: 'eq' | 'not_eq' | 'contains' | 'starts_with' | 'ends_with' | 'gt' | 'gte' | 'lt' | 'lte' | 'is_null' | 'is_not_null';
  value: string;
}

export interface StagedChange {
  rowId: any;
  column: string;
  originalValue: any;
  newValue: any;
}

export interface QueryResult {
  columns: string[];
  rows: any[][];
  count: number;
  duration_ms: number;
  error?: string;
}
