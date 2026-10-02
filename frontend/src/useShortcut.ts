import { useEffect, useRef } from 'react';
import {
  SHORTCUTS,
  ShortcutContext,
  ShortcutId,
  chordMatches,
  isTypingTarget,
  typingMode
} from './shortcuts';

type Handler = () => void;

interface Registration {
  enabled: () => boolean;
  accept: (event: KeyboardEvent) => boolean;
  handler: Handler;
}

interface Dismisser {
  id: string;
  priority: number;
  fn: () => void;
}

const registrations = new Map<ShortcutId, Set<Registration>>();
const dismissers: Dismisser[] = [];
let overlayCount = 0;
// Active data surface when focus is on body (no scoped element focused).
let activeSurface: 'tables' | 'sql' = 'tables';
let listening = false;

export function setShortcutSurface(next: 'tables' | 'sql') {
  activeSurface = next;
}

export function isOverlayOpen(): boolean {
  return overlayCount > 0;
}

function topDismisser(): Dismisser | null {
  if (dismissers.length === 0) return null;
  return dismissers.reduce((best, item) => (item.priority >= best.priority ? item : best));
}

function focusedScope(): 'tables' | 'sql' | 'console' | 'sidebar' | null {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const node = el.closest('[data-shortcut-scope]');
  const scope = node?.getAttribute('data-shortcut-scope');
  if (scope === 'tables' || scope === 'sql' || scope === 'console' || scope === 'sidebar') return scope;
  return null;
}

function contextActive(context: ShortcutContext): boolean {
  if (context === 'global') return true;
  if (context === 'modal') return overlayCount > 0;
  const scope = focusedScope();
  if (scope === 'console') return context === 'console';
  if (scope === 'sql') return context === 'sql';
  if (scope === 'tables' || scope === 'sidebar') return context === 'tables';
  if (context === 'console') return false;
  return context === activeSurface;
}

function onKeyDown(event: KeyboardEvent) {
  if (event.isComposing) return;
  const overlay = overlayCount > 0;
  const typing = isTypingTarget(event.target);
  const ids = Object.keys(SHORTCUTS) as ShortcutId[];

  for (const id of ids) {
    const shortcut = SHORTCUTS[id];
    if (shortcut.local) continue;
    if (!chordMatches(event, shortcut.chord)) continue;
    if (overlay && shortcut.context !== 'modal' && !shortcut.throughOverlay) continue;
    if (!overlay && shortcut.context === 'modal') continue;
    if (!overlay && shortcut.context !== 'global' && !contextActive(shortcut.context)) continue;
    if (overlay && shortcut.context === 'modal' && !contextActive('modal')) continue;
    if (typing && typingMode(id) === 'ignore') continue;

    const regs = registrations.get(id);
    if (!regs || regs.size === 0) continue;
    const accepted = [...regs].filter((reg) => reg.accept(event) && reg.enabled());
    if (accepted.length === 0) continue;
    event.preventDefault();
    event.stopPropagation();
    accepted.forEach((reg) => reg.handler());
    return;
  }
}

function ensureListener() {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('keydown', onKeyDown);
}

export function useShortcut(
  id: ShortcutId,
  handler: Handler,
  enabled: boolean | { enabled?: boolean; accept?: (event: KeyboardEvent) => boolean } = true
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const enabledRef = useRef(true);
  const acceptRef = useRef<(event: KeyboardEvent) => boolean>(() => true);

  if (typeof enabled === 'boolean') {
    enabledRef.current = enabled;
    acceptRef.current = () => true;
  } else {
    enabledRef.current = enabled.enabled !== false;
    acceptRef.current = enabled.accept ?? (() => true);
  }

  useEffect(() => {
    ensureListener();
    const reg: Registration = {
      enabled: () => enabledRef.current,
      accept: (event) => acceptRef.current(event),
      handler: () => handlerRef.current()
    };
    let set = registrations.get(id);
    if (!set) {
      set = new Set();
      registrations.set(id, set);
    }
    set.add(reg);
    return () => {
      set!.delete(reg);
    };
  }, [id]);
}

/**
 * Register several shortcuts from one call site so a new action only needs
 * a registry entry plus one entry here (instead of N `useShortcut` calls).
 * Ids should be static; handlers and enabled flags resolve live each keypress.
 */
export function useShortcuts(
  entries: Array<{
    id: ShortcutId;
    handler: Handler;
    enabled?: boolean | { enabled?: boolean; accept?: (event: KeyboardEvent) => boolean };
  }>
) {
  const liveRef = useRef(entries);
  liveRef.current = entries;
  const idsKey = entries.map((entry) => entry.id).join(',');

  useEffect(() => {
    ensureListener();
    const ids = liveRef.current.map((entry) => entry.id);
    const regs: Array<{ id: ShortcutId; reg: Registration }> = ids.map((id) => {
      const reg: Registration = {
        enabled: () => {
          const found = liveRef.current.find((item) => item.id === id);
          const flag = found?.enabled ?? true;
          return typeof flag === 'boolean' ? flag : (flag.enabled !== false);
        },
        accept: (event) => {
          const found = liveRef.current.find((item) => item.id === id);
          const flag = found?.enabled;
          const accept = typeof flag === 'object' ? flag.accept : undefined;
          return accept ? accept(event) : true;
        },
        handler: () => {
          liveRef.current.find((item) => item.id === id)?.handler();
        }
      };
      let set = registrations.get(id);
      if (!set) {
        set = new Set();
        registrations.set(id, set);
      }
      set.add(reg);
      return { id, reg };
    });
    return () => {
      for (const { id, reg } of regs) {
        registrations.get(id)?.delete(reg);
      }
    };
    // Re-subscribe only when the id set changes; handlers resolve via liveRef.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);
}

export function useOverlay(active: boolean) {
  useEffect(() => {
    if (!active) return;
    overlayCount += 1;
    return () => {
      overlayCount -= 1;
    };
  }, [active]);
}

export function useDismiss(id: string, fn: () => void, active: boolean, priority: number) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    if (!active) return;
    const item: Dismisser = { id, priority, fn: () => fnRef.current() };
    dismissers.push(item);
    return () => {
      const index = dismissers.indexOf(item);
      if (index >= 0) dismissers.splice(index, 1);
    };
  }, [id, active, priority]);
}

export function useEscapeDismiss() {
  useShortcut('dismiss', () => {
    const top = topDismisser();
    const typing = isTypingTarget(document.activeElement);
    if (top && top.priority >= 50) {
      top.fn();
      return;
    }
    if (typing && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
      return;
    }
    top?.fn();
  });
}
