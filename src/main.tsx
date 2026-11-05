import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import App from './App'; 
import './index.css';

// Production Error Fallback UI with soft recovery support
const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f0f0f] text-zinc-50 p-6 text-center select-none font-sans">
    <div className="w-14 h-14 bg-rose-600/10 border border-rose-600/20 rounded-2xl flex items-center justify-center text-rose-500 font-bold text-2xl mb-4 shadow-sm">
      †
    </div>
    
    <h1 className="text-2xl font-black text-rose-500 mb-2 tracking-tight">
      Something went wrong
    </h1>
    
    <p className="text-xs text-zinc-400 max-w-sm mb-5 leading-relaxed font-medium">
      An unexpected error occurred in the workspace. You can try refreshing or resetting the app state.
    </p>

    {error?.message && (
      <pre className="text-[11px] font-mono bg-zinc-900 border border-zinc-800 text-rose-300 p-4 rounded-2xl overflow-x-auto max-w-lg w-full mb-6 text-left shadow-inner">
        {error.message}
      </pre>
    )}

    <div className="flex items-center gap-3">
      <button 
        type="button"
        onClick={resetErrorBoundary}
        className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition cursor-pointer border border-zinc-700 active:scale-95 shadow-sm"
      >
        Try Again
      </button>

      <button 
        type="button"
        onClick={() => window.location.reload()} 
        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer active:scale-95 shadow-md"
      >
        Reload Application
      </button>
    </div>
  </div>
);

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Failed to find the root element to mount the application.");
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </ErrorBoundary>
  </StrictMode>
);