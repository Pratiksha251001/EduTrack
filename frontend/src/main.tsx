import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './index.css';

// Safe non-blocking alert banner for iframe environments
if (typeof window !== 'undefined') {
  const originalAlert = window.alert;
  window.alert = (message?: any) => {
    console.info('[EduTrack Notice]:', message);
    try {
      let toast = document.getElementById('iframe-safe-toast-notification');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'iframe-safe-toast-notification';
        toast.style.position = 'fixed';
        toast.style.bottom = '24px';
        toast.style.right = '24px';
        toast.style.maxWidth = '420px';
        toast.style.zIndex = '999999';
        toast.style.padding = '12px 18px';
        toast.style.backgroundColor = '#0f172a';
        toast.style.color = '#f8fafc';
        toast.style.borderRadius = '12px';
        toast.style.border = '1px solid #334155';
        toast.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.5)';
        toast.style.fontSize = '13px';
        toast.style.lineHeight = '1.5';
        toast.style.fontFamily = 'inherit';
        toast.style.whiteSpace = 'pre-wrap';
        toast.style.transition = 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)';
        document.body.appendChild(toast);
      }
      toast.textContent = String(message ?? '');
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
      setTimeout(() => {
        if (toast) {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(8px)';
        }
      }, 5000);
    } catch {
      originalAlert?.call(window, message);
    }
  };
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
