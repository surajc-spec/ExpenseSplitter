import React from 'react';
import { Button } from './Button';

export const ErrorState = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-light-danger/10 dark:bg-dark-danger/10 border border-light-danger/20 dark:border-dark-danger/20 rounded-card my-4">
      <div className="w-12 h-12 rounded-full bg-light-danger/20 dark:bg-dark-danger/20 text-light-danger dark:text-dark-danger flex items-center justify-center text-xl font-bold mb-3">
        !
      </div>
      <h4 className="text-base font-bold text-light-foreground dark:text-dark-foreground mb-1">
        {title}
      </h4>
      <p className="text-sm text-light-muted dark:text-dark-muted mb-4 max-w-md">
        {message}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary" size="sm">
          Try Again
        </Button>
      )}
    </div>
  );
};
