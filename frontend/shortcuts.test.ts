import assert from 'node:assert/strict';
import { SHORTCUTS, chordMatches, shortcutLabel, typingMode } from './src/shortcuts.ts';
import type { ShortcutId } from './src/shortcuts.ts';
import { formatStudioHash, parseStudioHash } from './src/studioHash.ts';

function key(partial: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    code: '',
    ...partial
  } as KeyboardEvent;
}

// [shortcut id, event props, expected match]
const chordCases: Array<[ShortcutId, Partial<KeyboardEvent>, boolean]> = [
  ['saveChanges', { code: 'KeyS', metaKey: true }, true],
  ['saveStar', { code: 'KeyS', metaKey: true, altKey: true }, true],
  ['openStars', { code: 'KeyL', metaKey: true, altKey: true }, true],
  ['saveStar', { code: 'KeyS', metaKey: true }, false],
  ['saveStar', { code: 'KeyS', metaKey: true, shiftKey: true }, false],
  ['discardChanges', { code: 'KeyC', metaKey: true }, true],
  ['insertRow', { code: 'KeyN' }, true],
  // Bare letter keys tolerate Shift so Shift+N still opens a new row.
  ['insertRow', { code: 'KeyN', shiftKey: true }, true],
  ['insertRow', { code: 'KeyN', metaKey: true }, false],
  ['deleteRows', { code: 'KeyD' }, true],
  ['refreshTable', { code: 'KeyR' }, true],
  ['toggleFilters', { code: 'KeyF' }, true],
  ['toggleTheme', { code: 'KeyT' }, true],
  ['newSqlTab', { code: 'KeyN', ctrlKey: true, altKey: true }, true],
  ['newSqlTab', { code: 'KeyN', metaKey: true, altKey: true }, true],
  ['formatSql', { code: 'KeyF', metaKey: true, altKey: true }, true],
  ['clearFilters', { code: 'KeyX' }, true],
  ['clearSql', { code: 'KeyK', metaKey: true, altKey: true }, true],
  ['clearSql', { code: 'KeyK', ctrlKey: true, altKey: true }, true],
  ['clearSql', { code: 'KeyK', metaKey: true, shiftKey: true }, false],
  ['clearSql', { code: 'KeyK', metaKey: true }, false],
  ['clearConsole', { code: 'KeyK', metaKey: true, altKey: true }, true],
  ['clearConsole', { code: 'KeyK', ctrlKey: true, altKey: true }, true],
  ['toggleConsole', { code: 'Backquote', metaKey: true, altKey: true }, true],
  ['toggleConsole', { code: 'Backquote', ctrlKey: true, altKey: true }, true],
  ['toggleConsole', { code: 'Backquote', metaKey: true }, false],
  ['prevPage', { code: 'BracketLeft' }, true],
  ['viewTables', { code: 'BracketLeft', metaKey: true }, true],
  ['copyJson', { code: 'KeyC', ctrlKey: true, altKey: true }, true],
  ['exportCsv', { code: 'KeyE', ctrlKey: true, altKey: true }, true],
  ['sidebarSearch', { code: 'Slash' }, true],
  ['showShortcuts', { code: 'Slash', shiftKey: true }, true],
  // mod/alt chords must match Shift exactly.
  ['saveChanges', { code: 'KeyS', metaKey: true, shiftKey: true }, false],
  ['commandPalette', { code: 'KeyK', metaKey: true, shiftKey: true }, false],
  ['formatSql', { code: 'KeyF', metaKey: true, altKey: true, shiftKey: true }, false]
];

for (const [id, eventProps, expected] of chordCases) {
  assert.equal(chordMatches(key(eventProps), SHORTCUTS[id].chord), expected, `${id} ${JSON.stringify(eventProps)}`);
}
assert.equal(shortcutLabel('showShortcuts'), '?');
assert.equal(typingMode('deleteRows'), 'ignore');
assert.equal(typingMode('discardChanges'), 'ignore');
assert.equal(typingMode('saveChanges'), 'allow');
assert.equal(typingMode('applyFilters'), 'allow');
assert.equal(typingMode('newSqlTab'), 'allow');
assert.equal(SHORTCUTS.insertRow.chord.code, 'KeyN');
assert.equal(SHORTCUTS.newSqlTab.chord.alt, true);
assert.equal(SHORTCUTS.newSqlTab.chord.mod, true);
assert.equal(SHORTCUTS.clearSql.chord.code, 'KeyK');
assert.equal(SHORTCUTS.clearSql.chord.alt, true);
assert.equal(SHORTCUTS.clearSql.chord.shift, undefined);
assert.equal(SHORTCUTS.clearConsole.chord.code, 'KeyK');
assert.equal(SHORTCUTS.clearConsole.chord.alt, true);
assert.equal(SHORTCUTS.toggleConsole.chord.code, 'Backquote');
assert.equal(SHORTCUTS.toggleConsole.chord.alt, true);

// Registry invariant: every entry is self-describing, so a new action only
// needs a SHORTCUTS entry plus a useShortcut/useShortcuts call — no test edit.
for (const [id, def] of Object.entries(SHORTCUTS) as Array<[ShortcutId, (typeof SHORTCUTS)[ShortcutId]]>) {
  assert.ok(def.description.length > 0, `${id} needs a description`);
  assert.ok(def.chord.code.length > 0, `${id} needs a chord code`);
  assert.ok(['global', 'tables', 'sql', 'console', 'modal'].includes(def.context), `${id} has a valid context`);
}

assert.deepEqual(parseStudioHash('#tables/users'), { mode: 'tables', table: 'users', sql: '' });
assert.deepEqual(parseStudioHash('#sql'), { mode: 'sql', table: null, sql: '' });
assert.equal(parseStudioHash('#sql/SELECT%20*%20FROM%20users%20LIMIT%2025%3B').sql, 'SELECT * FROM users LIMIT 25;');
assert.equal(formatStudioHash({ mode: 'tables', table: 'users', sql: '' }), '#tables/users');
assert.equal(formatStudioHash({ mode: 'sql', table: null, sql: '' }), '#sql');
assert.equal(
  formatStudioHash({ mode: 'sql', table: null, sql: 'SELECT * FROM users LIMIT 25;' }),
  '#sql/SELECT%20*%20FROM%20users%20LIMIT%2025%3B'
);

console.log('shortcut registry checks passed');
