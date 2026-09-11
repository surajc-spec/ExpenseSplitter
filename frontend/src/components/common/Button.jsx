import React from 'react';

export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  className = '',
}) => {
  const baseStyle =
    'inline-flex items-center justify-center font-medium rounded-btn transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variantStyles = {
    primary:
      'bg-primary text-primary-foreground hover:bg-[#2fc48e] active:bg-[#28b07f]',
    secondary:
      'bg-light-surface-secondary dark:bg-dark-surface-secondary text-light-foreground dark:text-dark-foreground hover:bg-light-surface-tertiary dark:hover:bg-dark-surface-tertiary border border-light-border dark:border-dark-border',
    outline:
      'border-2 border-primary text-primary hover:bg-primary/10 active:bg-primary/20',
    danger:
      'bg-light-danger dark:bg-dark-danger text-white hover:opacity-90 active:opacity-100',
    ghost:
      'text-light-foreground dark:text-dark-foreground hover:bg-light-surface-secondary dark:hover:bg-dark-surface-secondary',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyle} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyle} ${className}`}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};
