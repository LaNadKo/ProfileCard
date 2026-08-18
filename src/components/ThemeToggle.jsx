import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { storageKey } from '../config/appConfig';
import { useI18n } from '../i18n/translations';

export const ThemeToggle = ({ lang }) => {
  const { t } = useI18n(lang);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(storageKey('theme'));
    if (saved) return saved;
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Listen to system theme changes automatically
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = (e) => {
      const hasManualOverride = localStorage.getItem(storageKey('theme_manual'));
      if (!hasManualOverride) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem(storageKey('theme'), nextTheme);
    localStorage.setItem(storageKey('theme_manual'), 'true');
  };

  return (
    <button
      onClick={toggleTheme}
      className="icon-btn"
      title={theme === 'dark' ? t.header.themeBtnLight : t.header.themeBtnDark}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};
