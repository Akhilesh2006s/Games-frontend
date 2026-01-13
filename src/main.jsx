import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// Add global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('Root element not found!');
} else {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (error) {
    console.error('Failed to render app:', error);
    rootElement.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; background-color: #0a0a0a; color: #fff; font-family: system-ui, sans-serif;">
        <h1 style="font-size: 24px; margin-bottom: 16px;">Failed to Load Application</h1>
        <p style="margin-bottom: 16px; color: #999;">${error.message}</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background-color: #6d6afe; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
          Reload Page
        </button>
      </div>
    `;
  }
}
