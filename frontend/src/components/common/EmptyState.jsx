import React from 'react';
import { Button } from './Button';

export const EmptyState = ({
  title = 'No data found',
  description = 'There are no records available at this time.',
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center border-2 border-dashed border-light-border dark:border-dark-border rounded-card bg-light-surface-secondary/50 dark:bg-dark-surface-secondary/50 my-4">
      <h4 className="text-lg font-bold text-light-foreground dark:text-dark-foreground mb-1">
        {title}
      </h4>
      <p className="text-sm text-light-muted dark:text-dark-muted max-w-sm mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
