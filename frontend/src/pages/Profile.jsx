import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const Profile = () => {
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-light-foreground dark:text-dark-foreground tracking-tight">
          User Profile
        </h1>
        <p className="text-xs md:text-sm text-light-muted dark:text-dark-muted mt-0.5">
          Your account details and preferences
        </p>
      </div>

      <Card className="flex flex-col gap-6 p-6 md:p-8">
        <div className="flex items-center gap-4 pb-6 border-b border-light-border dark:border-dark-border">
          <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground font-black text-2xl flex items-center justify-center shadow-card">
            {(user?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-light-foreground dark:text-dark-foreground">
                {user?.name || 'User'}
              </h2>
              <Badge variant="primary">{user?.role || 'user'}</Badge>
            </div>
            <p className="text-sm text-light-muted dark:text-dark-muted">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-card bg-light-surface-secondary dark:bg-dark-surface-secondary border border-light-border dark:border-dark-border">
            <span className="text-xs font-bold text-light-muted dark:text-dark-muted uppercase tracking-wider block mb-1">
              Account ID
            </span>
            <span className="text-xs font-mono font-bold text-light-foreground dark:text-dark-foreground break-all">
              {user?.userId || user?.id || '—'}
            </span>
          </div>

          <div className="p-4 rounded-card bg-light-surface-secondary dark:bg-dark-surface-secondary border border-light-border dark:border-dark-border flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-light-muted dark:text-dark-muted uppercase tracking-wider block mb-0.5">
                Theme Mode
              </span>
              <span className="text-xs font-bold text-light-foreground dark:text-dark-foreground">
                Light / Dark Toggle
              </span>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <div className="pt-4 border-t border-light-border dark:border-dark-border flex justify-end">
          <Button variant="danger" onClick={logout}>
            Log Out Account
          </Button>
        </div>
      </Card>
    </div>
  );
};
