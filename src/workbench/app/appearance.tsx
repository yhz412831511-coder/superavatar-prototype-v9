'use client';
import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from 'react';
import { scopeElements } from './host-bridge';
export type Appearance = {
  theme: 'light' | 'dark';
  fontSize: 'standard' | 'large';
  reducedMotion: boolean;
  showRoutineOperations: boolean;
};
export const initialAppearance: Appearance = {
  theme: 'light',
  fontSize: 'standard',
  reducedMotion: false,
  showRoutineOperations: true,
};
const AppearanceContext = createContext<{
  value: Appearance;
  update: (next: Partial<Appearance>) => void;
} | null>(null);
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<Appearance>(initialAppearance);
  useLayoutEffect(() => {
    // 主题只作用于工作台作用域节点（工作台容器和浮层根），不改宿主的 <html>。
    const roots = scopeElements();
    // Theme colors switch atomically; hover transitions must not interpolate
    // old foregrounds over the new palette's backgrounds.
    for (const root of roots) {
      root.dataset.themeChanging = 'true';
      root.dataset.theme = value.theme;
      root.dataset.fontSize = value.fontSize;
      root.dataset.reducedMotion = String(value.reducedMotion);
      root.classList.toggle('dark', value.theme === 'dark');
    }
    const timer = window.setTimeout(() => {
      for (const root of roots) delete root.dataset.themeChanging;
    }, 160);
    return () => window.clearTimeout(timer);
  }, [value]);
  return (
    <AppearanceContext.Provider
      value={{
        value,
        update: (next) => setValue((old) => ({ ...old, ...next })),
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}
export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error('AppearanceProvider required');
  return context;
}
