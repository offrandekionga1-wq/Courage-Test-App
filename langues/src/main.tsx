import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { App } from './App';
import { StoreProvider, useStore } from './store';
import { detectLocale, format, fr, I18nCtx, loadLocale, type Dict } from './i18n';
import './styles.css';

/** Charge la langue de l'interface et la met à disposition de tous les écrans. */
function I18nProvider({ children }: { children: ReactNode }) {
  const { state } = useStore();
  const locale = state.uiLang || detectLocale();
  const [dict, setDict] = useState<Dict>(fr as Dict);

  useEffect(() => {
    let live = true;
    loadLocale(locale).then((d) => { if (live) setDict(d); });
    document.documentElement.lang = locale;
    return () => { live = false; };
  }, [locale]);

  const value = useMemo(() => ({
    locale,
    t: (key: string, vars?: Record<string, string | number>) => format(dict[key] ?? (fr as Dict)[key] ?? key, vars),
  }), [dict, locale]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

createRoot(document.getElementById('root')!).render(
  <StoreProvider>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StoreProvider>,
);

if ('serviceWorker' in navigator && import.meta.env.PROD && !Capacitor.isNativePlatform()) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
