import assert from 'node:assert/strict';
import { SHORTCUTS, chordMatches, typingMode } from './src/shortcuts.ts';

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
assert.equal(chordMatches(key({ code: 'KeyS', metaKey: true, shiftKey: true }), SHORTCUTS.saveChanges.chord), false);
assert.equal(chordMatches(key({ code: 'KeyS', metaKey: true, shiftKey: true }), SHORTCUTS.saveStar.chord), true);
assert.equal(chordMatches(key({ code: 'KeyC', metaKey: true }), SHORTCUTS.discardChanges.chord), false);
assert.equal(chordMatches(key({ code: 'Delete', metaKey: true, shiftKey: true }), SHORTCUTS.discardChanges.chord), true);
assert.equal(chordMatches(key({ code: 'Delete' }), SHORTCUTS.deleteRows.chord), true);
assert.equal(chordMatches(key({ code: 'KeyR', metaKey: true, altKey: true }), SHORTCUTS.refreshTable.chord), true);
assert.equal(chordMatches(key({ code: 'KeyR', metaKey: true }), SHORTCUTS.refreshTable.chord), false);
assert.equal(chordMatches(key({ code: 'Slash' }), SHORTCUTS.sidebarSearch.chord), true);
assert.equal(chordMatches(key({ code: 'Slash', shiftKey: true }), SHORTCUTS.showShortcuts.chord), true);
assert.equal(typingMode('deleteRows'), 'ignore');
assert.equal(typingMode('saveChanges'), 'allow');
assert.equal(typingMode('applyFilters'), 'allow');
assert.equal(SHORTCUTS.insertRow.chord.code, 'KeyI');
assert.equal(SHORTCUTS.newSqlTab.chord.alt, true);
assert.equal(SHORTCUTS.toggleTheme.chord.shift, true);

console.log('shortcut registry checks passed');
