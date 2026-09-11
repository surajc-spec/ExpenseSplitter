import React, { useEffect } from 'react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity duration-200">
      <div
        className={`w-full ${maxWidth} bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-modal p-6 shadow-2xl transition-all duration-200 animate-in fade-in zoom-in-95`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-light-border dark:border-dark-border mb-4">
          <h3 className="text-xl font-bold text-light-foreground dark:text-dark-foreground">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-btn text-light-muted dark:text-dark-muted hover:bg-light-surface-secondary dark:hover:bg-dark-surface-secondary text-lg font-bold transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
