// Single source of truth for Rails Studio keyboard shortcuts.
// Button badges, the cheat sheet, and the command palette read this map.
// Key dispatch lives in useShortcut.ts.

export type ShortcutContext = 'global' | 'tables' | 'sql' | 'console' | 'modal';

export interface Chord {
  code: string;
  mod?: boolean;
  alt?: boolean;
  shift?: boolean;
}

export interface ShortcutDefinition {
  context: ShortcutContext;
  chord: Chord;
  description: string;
  group: 'Global & Navigation' | 'Table Data Browser' | 'SQL Runner' | 'Rails Console';
  /** Bare keys are ignored while typing. Modifier chords are allowed. */
  whenTyping?: 'allow' | 'ignore';
  /** Runs while a modal or drawer is open. */
  throughOverlay?: boolean;
  /** Documented here, but a local listener owns the event. */
  local?: boolean;
}

function defineShortcuts<const T extends Record<string, ShortcutDefinition>>(
  defs: T
): { [K in keyof T]: ShortcutDefinition } {
  return defs;
}

export const SHORTCUTS = defineShortcuts({
  commandPalette: {
    context: 'global',
    chord: { code: 'KeyK', mod: true },
    description: 'Open Command Palette / Quick Search',
    group: 'Global & Navigation',
    throughOverlay: true
  },
  toggleSidebar: {
    context: 'global',
    chord: { code: 'KeyB', mod: true },
    description: 'Toggle sidebar',
    group: 'Global & Navigation'
  },
  viewTables: {
    context: 'global',
    chord: { code: 'BracketLeft', mod: true },
    description: 'Switch to Tables browser',
    group: 'Global & Navigation'
  },
  viewSql: {
    context: 'global',
    chord: { code: 'BracketRight', mod: true },
    description: 'Switch to SQL Runner and focus editor',
    group: 'Global & Navigation'
  },
  toggleConsole: {
    context: 'global',
    chord: { code: 'Backquote', mod: true },
    description: 'Toggle Rails Console',
    group: 'Global & Navigation'
  },
  toggleTheme: {
    context: 'global',
    chord: { code: 'KeyL', mod: true, shift: true },
    description: 'Toggle light / dark theme',
    group: 'Global & Navigation'
  },
  showShortcuts: {
    context: 'global',
    chord: { code: 'Slash', shift: true },
    description: 'Open Keyboard Shortcuts',
    group: 'Global & Navigation',
    throughOverlay: true
  },
  dismiss: {
    context: 'global',
    chord: { code: 'Escape' },
    description: 'Close the top modal, drawer, or panel',
    group: 'Global & Navigation',
    throughOverlay: true
  },
  sidebarSearch: {
    context: 'global',
    chord: { code: 'Slash' },
    description: 'Focus and filter tables in the sidebar',
    group: 'Global & Navigation',
    local: true
  },
  sidebarUp: {
    context: 'tables',
    chord: { code: 'ArrowUp' },
    description: 'Move highlight up in the sidebar table list',
    group: 'Global & Navigation',
    local: true
  },
  sidebarDown: {
    context: 'tables',
    chord: { code: 'ArrowDown' },
    description: 'Move highlight down in the sidebar table list',
    group: 'Global & Navigation',
    local: true
  },
  sidebarOpen: {
    context: 'tables',
    chord: { code: 'Enter' },
    description: 'Open the highlighted sidebar table',
    group: 'Global & Navigation',
    local: true
  },
  focusCycle: {
    context: 'tables',
    chord: { code: 'Tab' },
    description: 'Switch focus between sidebar and table',
    group: 'Global & Navigation'
  },
  focusSidebar: {
    context: 'tables',
    chord: { code: 'ArrowLeft' },
    description: 'Focus the sidebar',
    group: 'Global & Navigation'
  },
  focusTable: {
    context: 'tables',
    chord: { code: 'ArrowRight' },
    description: 'Focus the table',
    group: 'Global & Navigation'
  },
  insertRow: {
    context: 'tables',
    chord: { code: 'KeyI', mod: true },
    description: 'Add a new row',
    group: 'Table Data Browser'
  },
  deleteRows: {
    context: 'tables',
    chord: { code: 'Delete' },
    description: 'Delete selected rows',
    group: 'Table Data Browser'
  },
  saveChanges: {
    context: 'tables',
    chord: { code: 'KeyS', mod: true },
    description: 'Save pending cell edits',
    group: 'Table Data Browser'
  },
  discardChanges: {
    context: 'tables',
    chord: { code: 'Delete', mod: true, shift: true },
    description: 'Discard pending cell edits',
    group: 'Table Data Browser'
  },
  refreshTable: {
    context: 'tables',
    chord: { code: 'KeyR', mod: true, alt: true },
    description: 'Refresh the current table',
    group: 'Table Data Browser'
  },
  toggleFilters: {
    context: 'tables',
    chord: { code: 'KeyF', mod: true },
    description: 'Toggle the column filter bar',
    group: 'Table Data Browser'
  },
  applyFilters: {
    context: 'tables',
    chord: { code: 'Enter' },
    description: 'Apply filters while the filter bar is open',
    group: 'Table Data Browser',
    whenTyping: 'allow'
  },
  clearFilters: {
    context: 'tables',
    chord: { code: 'Backspace', mod: true, alt: true },
    description: 'Clear all filters',
    group: 'Table Data Browser'
  },
  prevPage: {
    context: 'tables',
    chord: { code: 'ArrowLeft', mod: true, alt: true },
    description: 'Previous page',
    group: 'Table Data Browser'
  },
  nextPage: {
    context: 'tables',
    chord: { code: 'ArrowRight', mod: true, alt: true },
    description: 'Next page',
    group: 'Table Data Browser'
  },
  rowUp: {
    context: 'tables',
    chord: { code: 'ArrowUp' },
    description: 'Move highlight up on table rows',
    group: 'Table Data Browser',
    local: true
  },
  rowDown: {
    context: 'tables',
    chord: { code: 'ArrowDown' },
    description: 'Move highlight down on table rows',
    group: 'Table Data Browser',
    local: true
  },
  rowToggle: {
    context: 'tables',
    chord: { code: 'Space' },
    description: 'Toggle the checkbox on the focused row',
    group: 'Table Data Browser',
    local: true
  },
  runSql: {
    context: 'sql',
    chord: { code: 'Enter', mod: true },
    description: 'Run the SQL query',
    group: 'SQL Runner'
  },
  formatSql: {
    context: 'sql',
    chord: { code: 'KeyF', mod: true, shift: true },
    description: 'Format SQL',
    group: 'SQL Runner'
  },
  newSqlTab: {
    context: 'sql',
    chord: { code: 'KeyT', mod: true, alt: true },
    description: 'New SQL query tab',
    group: 'SQL Runner'
  },
  closeSqlTab: {
    context: 'sql',
    chord: { code: 'KeyW', mod: true, alt: true },
    description: 'Close the SQL query tab',
    group: 'SQL Runner'
  },
  clearSql: {
    context: 'sql',
    chord: { code: 'KeyX', mod: true, alt: true },
    description: 'Clear the SQL editor',
    group: 'SQL Runner'
  },
  toggleSplit: {
    context: 'sql',
    chord: { code: 'Backslash', mod: true },
    description: 'Toggle editor / results split layout',
    group: 'SQL Runner'
  },
  openStars: {
    context: 'sql',
    chord: { code: 'KeyS', mod: true, alt: true },
    description: 'Open starred SQL queries',
    group: 'SQL Runner'
  },
  saveStar: {
    context: 'sql',
    chord: { code: 'KeyS', mod: true, shift: true },
    description: 'Save the current SQL to Stars',
    group: 'SQL Runner'
  },
  copyJson: {
    context: 'sql',
    chord: { code: 'KeyC', mod: true, alt: true },
    description: 'Copy results as JSON',
    group: 'SQL Runner'
  },
  exportCsv: {
    context: 'sql',
    chord: { code: 'KeyE', mod: true, alt: true },
    description: 'Export results to CSV',
    group: 'SQL Runner'
  },
  deleteResultRows: {
    context: 'sql',
    chord: { code: 'Delete' },
    description: 'Delete selected result rows',
    group: 'SQL Runner'
  },
  saveResultEdits: {
    context: 'sql',
    chord: { code: 'KeyS', mod: true },
    description: 'Save pending result cell edits',
    group: 'SQL Runner'
  },
  discardResultEdits: {
    context: 'sql',
    chord: { code: 'Delete', mod: true, shift: true },
    description: 'Discard pending result cell edits',
    group: 'SQL Runner'
  },
  sqlPane: {
    context: 'sql',
    chord: { code: 'Tab' },
    description: 'Switch between the SQL editor and results',
    group: 'SQL Runner',
    local: true
  },
  resultUp: {
    context: 'sql',
    chord: { code: 'ArrowUp' },
    description: 'Move highlight up on result rows',
    group: 'SQL Runner',
    local: true
  },
  resultDown: {
    context: 'sql',
    chord: { code: 'ArrowDown' },
    description: 'Move highlight down on result rows',
    group: 'SQL Runner',
    local: true
  },
  resultToggle: {
    context: 'sql',
    chord: { code: 'Space' },
    description: 'Toggle the checkbox on the focused result row',
    group: 'SQL Runner',
    local: true
  },
  clearConsole: {
    context: 'console',
    chord: { code: 'KeyK', mod: true, alt: true },
    description: 'Clear console output',
    group: 'Rails Console'
  },
  maximizeConsole: {
    context: 'console',
    chord: { code: 'KeyM', mod: true, alt: true },
    description: 'Maximize or restore the console',
    group: 'Rails Console'
  },
  insertRecord: {
    context: 'modal',
    chord: { code: 'Enter', mod: true },
    description: 'Save the insert form',
    group: 'Table Data Browser'
  }
});

export type ShortcutId = keyof typeof SHORTCUTS;

export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
}

export function chordMatches(event: KeyboardEvent, chord: Chord): boolean {
  const hasMod = event.metaKey || event.ctrlKey;
  if (hasMod !== Boolean(chord.mod)) return false;
  if (event.altKey !== Boolean(chord.alt)) return false;
  if (event.shiftKey !== Boolean(chord.shift)) return false;
  return event.code === chord.code;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable;
}

function keyLabel(chord: Chord): string {
  if (chord.code === 'Slash' && chord.shift) return '?';
  switch (chord.code) {
    case 'Enter':
      return '↩';
    case 'Escape':
      return 'Esc';
    case 'Backspace':
      return '⌫';
    case 'Delete':
      return 'Delete';
    case 'ArrowLeft':
      return '←';
    case 'ArrowRight':
      return '→';
    case 'ArrowUp':
      return '↑';
    case 'ArrowDown':
      return '↓';
    case 'Space':
      return 'Space';
    case 'Tab':
      return 'Tab';
    case 'Backquote':
      return '`';
    case 'Backslash':
      return '\\';
    case 'BracketLeft':
      return '[';
    case 'BracketRight':
      return ']';
    case 'Slash':
      return '/';
    default:
      return chord.code.startsWith('Key') ? chord.code.slice(3) : chord.code;
  }
}

export function shortcutKeyParts(id: ShortcutId): string[] {
  const chord = SHORTCUTS[id].chord;
  const mac = isMac();
  const parts: string[] = [];
  if (chord.alt) parts.push(mac ? '⌥' : 'Alt');
  if (chord.mod) parts.push(mac ? '⌘' : 'Ctrl');
  if (chord.shift) parts.push(mac ? '⇧' : 'Shift');
  parts.push(keyLabel(chord));
  return parts;
}

export function shortcutLabel(id: ShortcutId): string {
  const parts = shortcutKeyParts(id);
  return isMac() ? parts.join('') : parts.join('+');
}

export function shortcutGroups(): { title: string; ids: ShortcutId[] }[] {
  const order: ShortcutDefinition['group'][] = [
    'Global & Navigation',
    'Table Data Browser',
    'SQL Runner',
    'Rails Console'
  ];
  return order.map((title) => ({
    title,
    ids: (Object.keys(SHORTCUTS) as ShortcutId[]).filter((id) => SHORTCUTS[id].group === title)
  }));
}

export function typingMode(id: ShortcutId): 'allow' | 'ignore' {
  const shortcut = SHORTCUTS[id];
  if (shortcut.whenTyping) return shortcut.whenTyping;
  return shortcut.chord.mod || shortcut.chord.alt ? 'allow' : 'ignore';
}
