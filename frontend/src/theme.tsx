import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: (event?: { clientX: number; clientY: number }) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const applyFavicon = (resolved: 'light' | 'dark') => {
  const base = (window as any).__RAILS_STUDIO_CONFIG__?.basePath || '';
  const favicon = document.getElementById('favicon') as HTMLLinkElement | null;
  if (!favicon) return;
  const file = resolved === 'dark' ? 'logo-dark.svg' : 'logo-light.svg';
  favicon.href = `${base}/assets/${file}`;
};

const resolveTheme = (theme: Theme): 'light' | 'dark' => {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
};

const paintTheme = (resolved: 'light' | 'dark', syncColorScheme = true) => {
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
  }
  if (syncColorScheme) {
    root.style.colorScheme = resolved;
  }
  applyFavicon(resolved);
};

const nativeStartViewTransition = () =>
  Document.prototype.startViewTransition?.bind(document) ??
  document.startViewTransition.bind(document);

const clickPoint = (event?: { clientX: number; clientY: number }) => {
  if (event && typeof event.clientX === 'number' && !('key' in event)) {
    return { x: event.clientX, y: event.clientY };
  }
  const btn = document.querySelector('[data-theme-toggle]');
  if (btn) {
    const r = btn.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return { x: window.innerWidth - 36, y: 28 };
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('rails_studio_theme') as Theme;
      if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
    } catch {
      // ignore
    }
    return 'dark';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    const transitioning = document.documentElement.classList.contains('theme-transitioning');
    paintTheme(resolved, !transitioning);

    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      const next = resolveTheme('system');
      setResolvedTheme(next);
      paintTheme(next);
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  const setTheme = (newTheme: Theme, syncColorScheme = true) => {
    setThemeState(newTheme);
    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    paintTheme(resolved, syncColorScheme);
    try {
      localStorage.setItem('rails_studio_theme', newTheme);
    } catch {
      // ignore
    }
  };

  const toggleTheme = (event?: { clientX: number; clientY: number }) => {
    const next: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const startViewTransition = nativeStartViewTransition();
    const canTransition = typeof startViewTransition === 'function' && !reducedMotion;

    if (!canTransition) {
      setTheme(next);
      return;
    }

    const { x, y } = clickPoint(event);
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    const root = document.documentElement;

    const goingDark = next === 'dark';
    if (root.classList.contains('theme-transitioning')) return;
    root.classList.add('theme-transitioning');
    if (goingDark) root.classList.add('theme-reveal-old');
    root.style.setProperty('--vt-x', `${x}px`);
    root.style.setProperty('--vt-y', `${y}px`);
    root.style.setProperty('--vt-r', `${endRadius}px`);
    root.style.setProperty('--vt-bg', goingDark ? '#f8fafc' : '#09090b');
    root.style.colorScheme = goingDark ? 'light' : 'dark';
    void root.offsetWidth;

    let timeout = 0;
    let finished = false;
    let transition: ViewTransition | undefined;
    const finish = (skip = false) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      if (skip) {
        try {
          transition?.skipTransition();
        } catch {
          // ignore
        }
      }
      root.classList.remove('theme-transitioning', 'theme-reveal-old');
      root.style.removeProperty('--vt-x');
      root.style.removeProperty('--vt-y');
      root.style.removeProperty('--vt-r');
      root.style.removeProperty('--vt-bg');
      setThemeState(next);
      setResolvedTheme(resolveTheme(next));
      paintTheme(resolveTheme(next), true);
      try {
        localStorage.setItem('rails_studio_theme', next);
      } catch {
        // ignore
      }
    };
    timeout = window.setTimeout(() => finish(true), 800);

    try {
      transition = startViewTransition(() => {
        paintTheme(resolveTheme(next), false);
        try {
          localStorage.setItem('rails_studio_theme', next);
        } catch {
          // ignore
        }
      });
    } catch {
      finish(true);
      return;
    }

    transition.finished.then(() => finish(false)).catch(() => finish(true));
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
