import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryProvider } from './app/memory-store';
import { FiscalWorkbench } from './app/fiscal-workbench';
import { AppearanceProvider } from './app/appearance';
import { hostApi, onReset, SCOPE_ID } from './app/host-bridge';
import './app/globals.css';
import './host-theme.css';

function Workbench() {
  const [generation, setGeneration] = useState(0);
  useEffect(() => onReset(() => setGeneration((g) => g + 1)), []);
  return (
    <AppearanceProvider key={generation}>
      <MemoryProvider>
        <FiscalWorkbench />
      </MemoryProvider>
    </AppearanceProvider>
  );
}

window.SAWorkbench = hostApi;
const el = document.getElementById(SCOPE_ID);
if (el) {
  createRoot(el).render(
    <StrictMode>
      <Workbench />
    </StrictMode>,
  );
  window.dispatchEvent(new CustomEvent('sa-workbench-ready'));
}
