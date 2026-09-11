import React from 'react';

export const Card = ({
  children,
  className = '',
  onClick,
  hoverable = false,
}) => {
  const hoverStyle = hoverable
    ? 'cursor-pointer hover:shadow-card-hover transition-shadow duration-200'
    : '';

  return (
    <div
      onClick={onClick}
      className={`bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border rounded-card p-6 shadow-card ${hoverStyle} ${className}`}
    >
      {children}
    </div>
  );
};
