// Single source of truth for Rails Studio keyboard shortcuts.
// Button badges, the cheat sheet, and the command palette read this map.
// Key dispatch lives in useShortcut.ts.

export type ShortcutContext = 'global' | 'tables' | 'sql' | 'console' | 'modal';

export interface Chord {
  code: string;
  /** Command on Mac, Ctrl on other platforms. */
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
  /** Also active while a modal or drawer overlay is open. */
  throughOverlay?: boolean;
  /** Registry documents the chord, but a component-local listener handles it; the global dispatcher skips it. */
  local?: boolean;
}

// Widen each entry to ShortcutDefinition while keeping literal keys,
// so SHORTCUTS[id].chord.mod etc. type-check without narrowing.
function defineShortcuts<T extends Record<string, ShortcutDefinition>>(
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
    chord: { code: 'Backquote', mod: true, alt: true },
    description: 'Toggle Rails Console',
    group: 'Global & Navigation'
  },
  toggleTheme: {
    context: 'global',
    chord: { code: 'KeyT' },
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
    chord: { code: 'KeyN' },
    description: 'Add a new row',
    group: 'Table Data Browser'
  },
  deleteRows: {
    context: 'tables',
    chord: { code: 'KeyD' },
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
    chord: { code: 'KeyC', mod: true },
    description: 'Discard pending cell edits',
    group: 'Table Data Browser',
    whenTyping: 'ignore'
  },
  refreshTable: {
    context: 'tables',
    chord: { code: 'KeyR' },
    description: 'Refresh the current table',
    group: 'Table Data Browser'
  },
  toggleFilters: {
    context: 'tables',
    chord: { code: 'KeyF' },
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
    chord: { code: 'KeyX' },
    description: 'Clear all filters',
    group: 'Table Data Browser'
  },
  prevPage: {
    context: 'tables',
    chord: { code: 'BracketLeft' },
    description: 'Previous page',
    group: 'Table Data Browser'
  },
  nextPage: {
    context: 'tables',
    chord: { code: 'BracketRight' },
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
    chord: { code: 'KeyF', mod: true, alt: true },
    description: 'Format SQL',
    group: 'SQL Runner'
  },
  newSqlTab: {
    context: 'sql',
    chord: { code: 'KeyN', mod: true, alt: true },
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
    chord: { code: 'KeyK', mod: true, alt: true },
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
    chord: { code: 'KeyL', mod: true, alt: true },
    description: 'Open the starred SQL list',
    group: 'SQL Runner'
  },
  saveStar: {
    context: 'sql',
    chord: { code: 'KeyS', mod: true, alt: true },
    description: 'Star the current SQL',
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
    chord: { code: 'KeyD' },
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
    chord: { code: 'KeyC', mod: true },
    description: 'Discard pending result cell edits',
    group: 'SQL Runner',
    whenTyping: 'ignore'
  },
  sqlPane: {
    context: 'sql',
    chord: { code: 'Tab' },
    description: 'Switch focus between the SQL editor, results, and the table list',
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
    chord: { code: 'KeyS', mod: true },
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
  if ((event.metaKey || event.ctrlKey) !== Boolean(chord.mod)) return false;
  if (event.altKey !== Boolean(chord.alt)) return false;
  const letter = chord.code.startsWith('Key');
  if (chord.shift) {
    if (!event.shiftKey) return false;
  } else if (event.shiftKey) {
    // Bare letter keys tolerate Shift so Shift+N still opens a new row,
    // but mod/alt chords must match Shift exactly.
    if (chord.mod || chord.alt || !letter) return false;
  }
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
      return 'Enter';
    case 'Escape':
      return 'Esc';
    case 'Backspace':
      return 'Backspace';
    case 'Delete':
      return 'Delete';
    case 'ArrowLeft':
      return 'Left';
    case 'ArrowRight':
      return 'Right';
    case 'ArrowUp':
      return 'Up';
    case 'ArrowDown':
      return 'Down';
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
  const parts: string[] = [];
  if (chord.mod) parts.push(isMac() ? 'Cmd' : 'Ctrl');
  if (chord.alt) parts.push('Alt');
  const label = keyLabel(chord);
  if (chord.shift && label !== '?') parts.push('Shift');
  parts.push(label);
  return parts;
}

export function shortcutLabel(id: ShortcutId): string {
  return shortcutKeyParts(id).join('+');
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
