import assert from 'node:assert/strict';
import { SHORTCUTS, chordMatches, shortcutLabel, typingMode } from './src/shortcuts.ts';
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

assert.equal(chordMatches(key({ code: 'KeyS', metaKey: true }), SHORTCUTS.saveChanges.chord), true);
assert.equal(chordMatches(key({ code: 'KeyS', metaKey: true, altKey: true }), SHORTCUTS.saveStar.chord), true);
assert.equal(chordMatches(key({ code: 'KeyL', metaKey: true, altKey: true }), SHORTCUTS.openStars.chord), true);
assert.equal(chordMatches(key({ code: 'KeyS', metaKey: true }), SHORTCUTS.saveStar.chord), false);
assert.equal(chordMatches(key({ code: 'KeyS', metaKey: true, shiftKey: true }), SHORTCUTS.saveStar.chord), false);
assert.equal(chordMatches(key({ code: 'KeyC', metaKey: true }), SHORTCUTS.discardChanges.chord), true);
assert.equal(chordMatches(key({ code: 'KeyN' }), SHORTCUTS.insertRow.chord), true);
assert.equal(chordMatches(key({ code: 'KeyN', shiftKey: true }), SHORTCUTS.insertRow.chord), true);
assert.equal(chordMatches(key({ code: 'KeyN', metaKey: true }), SHORTCUTS.insertRow.chord), false);
assert.equal(chordMatches(key({ code: 'KeyD' }), SHORTCUTS.deleteRows.chord), true);
assert.equal(chordMatches(key({ code: 'KeyR' }), SHORTCUTS.refreshTable.chord), true);
assert.equal(chordMatches(key({ code: 'KeyF' }), SHORTCUTS.toggleFilters.chord), true);
assert.equal(chordMatches(key({ code: 'KeyT' }), SHORTCUTS.toggleTheme.chord), true);
assert.equal(chordMatches(key({ code: 'KeyN', ctrlKey: true, altKey: true }), SHORTCUTS.newSqlTab.chord), true);
assert.equal(chordMatches(key({ code: 'KeyN', metaKey: true, altKey: true }), SHORTCUTS.newSqlTab.chord), true);
assert.equal(chordMatches(key({ code: 'KeyF', metaKey: true, altKey: true }), SHORTCUTS.formatSql.chord), true);
assert.equal(chordMatches(key({ code: 'KeyX' }), SHORTCUTS.clearFilters.chord), true);
assert.equal(chordMatches(key({ code: 'KeyN', metaKey: true, shiftKey: true }), SHORTCUTS.clearSql.chord), true);
assert.equal(chordMatches(key({ code: 'KeyN', ctrlKey: true, shiftKey: true }), SHORTCUTS.clearSql.chord), true);
assert.equal(chordMatches(key({ code: 'KeyX', ctrlKey: true, altKey: true }), SHORTCUTS.clearSql.chord), false);
assert.equal(chordMatches(key({ code: 'BracketLeft' }), SHORTCUTS.prevPage.chord), true);
assert.equal(chordMatches(key({ code: 'BracketLeft', metaKey: true }), SHORTCUTS.viewTables.chord), true);
assert.equal(chordMatches(key({ code: 'KeyC', ctrlKey: true, altKey: true }), SHORTCUTS.copyJson.chord), true);
assert.equal(chordMatches(key({ code: 'KeyE', ctrlKey: true, altKey: true }), SHORTCUTS.exportCsv.chord), true);
assert.equal(chordMatches(key({ code: 'Slash' }), SHORTCUTS.sidebarSearch.chord), true);
assert.equal(chordMatches(key({ code: 'Slash', shiftKey: true }), SHORTCUTS.showShortcuts.chord), true);
assert.equal(shortcutLabel('showShortcuts'), '?');
assert.equal(typingMode('deleteRows'), 'ignore');
assert.equal(typingMode('discardChanges'), 'ignore');
assert.equal(typingMode('saveChanges'), 'allow');
assert.equal(typingMode('applyFilters'), 'allow');
assert.equal(typingMode('newSqlTab'), 'allow');
assert.equal(SHORTCUTS.insertRow.chord.code, 'KeyN');
assert.equal(SHORTCUTS.newSqlTab.chord.alt, true);
assert.equal(SHORTCUTS.newSqlTab.chord.mod, true);
assert.equal(SHORTCUTS.clearSql.chord.shift, true);

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
