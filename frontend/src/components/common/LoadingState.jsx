import React from 'react';

export const LoadingState = ({ message = 'Loading details...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-sm font-medium text-light-muted dark:text-dark-muted">
        {message}
      </p>
    </div>
  );
};
