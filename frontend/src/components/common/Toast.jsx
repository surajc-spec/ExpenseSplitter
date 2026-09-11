import React, { useEffect } from 'react';

export const Toast = ({ message, type = 'info', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const bgStyles = {
    success: 'bg-light-success dark:bg-dark-success text-white',
    danger: 'bg-light-danger dark:bg-dark-danger text-white',
    warning: 'bg-light-warning dark:bg-dark-warning text-white',
    info: 'bg-light-surface-tertiary dark:bg-dark-surface-tertiary text-light-foreground dark:text-dark-foreground border border-light-border dark:border-dark-border',
  };

  return (
    <div className="fixed bottom-6 right-6 z-toast max-w-sm w-full animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div className={`p-4 rounded-card shadow-card flex items-center justify-between gap-3 ${bgStyles[type]}`}>
        <p className="text-sm font-medium">{message}</p>
        <button
          onClick={onClose}
          className="text-lg font-bold leading-none hover:opacity-80 transition-opacity"
        >
          ×
        </button>
      </div>
    </div>
  );
};
