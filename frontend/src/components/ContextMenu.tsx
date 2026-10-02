import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDismiss } from '../useShortcut';

export interface ContextMenuItem {
  id?: string;
  label?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  onClick?: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallback below
    }
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x, y });
  const [measured, setMeasured] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Filter clickable items for keyboard navigation
  const clickableItems = items.filter((item) => !item.separator && !item.disabled && Boolean(item.onClick));

  useDismiss('context-menu', onClose, true, 80);

  // Position within viewport boundaries
  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const padding = 8;
    let nextX = x;
    let nextY = y;

    if (nextX + rect.width > window.innerWidth - padding) {
      nextX = Math.max(padding, window.innerWidth - rect.width - padding);
    }
    if (nextY + rect.height > window.innerHeight - padding) {
      nextY = Math.max(padding, window.innerHeight - rect.height - padding);
    }
    setCoords({ x: nextX, y: nextY });
    setMeasured(true);
  }, [x, y]);

  // Dismiss on outside click, window resize, or scroll
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleScroll = (e: Event) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      onClose();
    };

    const handleResize = () => onClose();

    window.addEventListener('mousedown', handlePointerDown, true);
    window.addEventListener('touchstart', handlePointerDown, true);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown, true);
      window.removeEventListener('touchstart', handlePointerDown, true);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [onClose]);

  // Keyboard navigation within the context menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (clickableItems.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setFocusedIndex((prev) => (prev + 1) % clickableItems.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setFocusedIndex((prev) => (prev <= 0 ? clickableItems.length - 1 : prev - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (focusedIndex >= 0 && focusedIndex < clickableItems.length) {
          clickableItems[focusedIndex].onClick?.();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [clickableItems, focusedIndex, onClose]);

  let clickableCursor = -1;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-orientation="vertical"
      style={{
        left: coords.x,
        top: coords.y,
        visibility: measured ? 'visible' : 'hidden'
      }}
      className="fixed z-50 min-w-[190px] py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg shadow-xl shadow-slate-900/10 dark:shadow-black/50 text-xs font-mono select-none"
      onClick={(e) => e.stopPropagation()}
      onMouseLeave={() => setFocusedIndex(-1)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {items.map((item, idx) => {
        if (item.separator) {
          return (
            <div
              key={`sep-${idx}`}
              role="separator"
              className="my-1 border-t border-slate-100 dark:border-zinc-800"
            />
          );
        }

        const isClickable = !item.disabled && Boolean(item.onClick);
        if (isClickable) clickableCursor += 1;
        const itemIndex = clickableCursor;
        const isFocused = isClickable && itemIndex === focusedIndex;

        return (
          <button
            key={item.id ?? `item-${idx}`}
            role="menuitem"
            type="button"
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return;
              item.onClick?.();
              onClose();
            }}
            onMouseMove={() => {
              if (isClickable && focusedIndex !== itemIndex) setFocusedIndex(itemIndex);
            }}
            className={`w-full px-3 py-1.5 flex items-center justify-between text-left transition-colors cursor-pointer disabled:cursor-not-allowed ${
              item.disabled
                ? 'opacity-40 text-slate-400 dark:text-zinc-600'
                : item.danger
                ? isFocused
                  ? 'bg-rose-500 text-white'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                : isFocused
                ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white'
                : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="flex items-center space-x-2 truncate">
              {item.icon && (
                <span
                  className={`shrink-0 ${
                    item.danger
                      ? isFocused
                        ? 'text-white'
                        : 'text-rose-500 dark:text-rose-400'
                      : isFocused
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-400 dark:text-zinc-500'
                  }`}
                >
                  {item.icon}
                </span>
              )}
              <span className="truncate">{item.label}</span>
            </span>

            {item.shortcut && (
              <kbd
                className={`ml-3 shrink-0 px-1 py-0.2 text-[10px] font-mono rounded ${
                  isFocused && item.danger
                    ? 'bg-rose-600 text-rose-100'
                    : isFocused
                    ? 'bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-200'
                    : 'bg-slate-100 dark:bg-zinc-800/80 text-slate-400 dark:text-zinc-500 border border-slate-200/80 dark:border-zinc-700/60'
                }`}
              >
                {item.shortcut}
              </kbd>
            )}
          </button>
        );
      })}
    </div>
  );
};
