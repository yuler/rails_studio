export interface StudioLocation {
  mode: 'tables' | 'sql';
  table: string | null;
  sql: string;
}

const EMPTY: StudioLocation = { mode: 'tables', table: null, sql: '' };

function decodePart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseStudioHash(hash: string): StudioLocation {
  const raw = hash.replace(/^#/, '');
  if (raw === 'sql' || raw.startsWith('sql/')) {
    const encoded = raw.startsWith('sql/') ? raw.slice(4) : '';
    return { mode: 'sql', table: null, sql: encoded ? decodePart(encoded) : '' };
  }
  if (raw === 'tables' || raw.startsWith('tables/')) {
    const encoded = raw.startsWith('tables/') ? raw.slice(7) : '';
    return { mode: 'tables', table: encoded ? decodePart(encoded) : null, sql: '' };
  }
  return EMPTY;
}

export function formatStudioHash(location: StudioLocation): string {
  if (location.mode === 'sql') {
    return location.sql ? `#sql/${encodeURIComponent(location.sql)}` : '#sql';
  }
  return location.table ? `#tables/${encodeURIComponent(location.table)}` : '#tables';
}

export function readStudioHash(): StudioLocation {
  if (typeof window === 'undefined') return EMPTY;
  return parseStudioHash(window.location.hash);
}

export function replaceStudioHash(location: StudioLocation) {
  if (typeof window === 'undefined') return;
  const next = formatStudioHash(location);
  const current = formatStudioHash(parseStudioHash(window.location.hash));
  if (next === current) return;
  const url = `${window.location.pathname}${window.location.search}${next}`;
  window.history.replaceState(window.history.state, '', url);
}
