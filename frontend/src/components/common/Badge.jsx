import React from 'react';

export const Badge = ({
  children,
  variant = 'muted',
  className = '',
}) => {
  const variantStyles = {
    primary: 'bg-primary/20 text-primary border border-primary/30',
    success: 'bg-light-success/10 dark:bg-dark-success/20 text-light-success dark:text-dark-success border border-light-success/30',
    warning: 'bg-light-warning/10 dark:bg-dark-warning/20 text-light-warning dark:text-dark-warning border border-light-warning/30',
    danger: 'bg-light-danger/10 dark:bg-dark-danger/20 text-light-danger dark:text-dark-danger border border-light-danger/30',
    muted: 'bg-light-surface-secondary dark:bg-dark-surface-secondary text-light-muted dark:text-dark-muted border border-light-border dark:border-dark-border',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-badge text-xs font-semibold ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
