import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

export const Hero = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <section className="py-16 md:py-24 text-center px-4 max-w-5xl mx-auto">
      <div className="inline-flex items-center gap-2 mb-6">
        <Badge variant="primary">Production-Grade Expense Platform</Badge>
        <span className="text-xs text-light-muted dark:text-dark-muted font-bold">
          PostgreSQL & Redis Protected
        </span>
      </div>

      <h1 className="text-4xl md:text-6xl font-black text-light-foreground dark:text-dark-foreground tracking-tight leading-tight mb-6">
        Split Expenses <span className="text-primary">Equitably</span> & Settle Debts Effortlessly
      </h1>

      <p className="text-base md:text-lg text-light-muted dark:text-dark-muted max-w-2xl mx-auto mb-8 font-medium">
        EquiSplit simplifies group finances with equal, exact, and percentage splitting, automated greedy debt consolidation, and ACID-safe transactional settlements.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        {user ? (
          <Button size="lg" variant="primary" onClick={() => navigate('/dashboard')}>
            Go to Your Dashboard →
          </Button>
        ) : (
          <>
            <Button size="lg" variant="primary" onClick={() => navigate('/register')}>
              Get Started for Free
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate('/login')}>
              Log In to Account
            </Button>
          </>
        )}
      </div>

      <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto pt-8 border-t border-light-border dark:border-dark-border text-left">
        <div className="p-3 rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border">
          <p className="text-xs text-light-muted dark:text-dark-muted font-bold uppercase">Debt Minification</p>
          <p className="text-sm font-black text-light-foreground dark:text-dark-foreground mt-0.5">Greedy Algorithm</p>
        </div>
        <div className="p-3 rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border">
          <p className="text-xs text-light-muted dark:text-dark-muted font-bold uppercase">Race Condition Safe</p>
          <p className="text-sm font-black text-light-foreground dark:text-dark-foreground mt-0.5">Advisory Locks</p>
        </div>
        <div className="p-3 rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border">
          <p className="text-xs text-light-muted dark:text-dark-muted font-bold uppercase">Financial Accuracy</p>
          <p className="text-sm font-black text-light-foreground dark:text-dark-foreground mt-0.5">Integer Paise</p>
        </div>
        <div className="p-3 rounded-card bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border">
          <p className="text-xs text-light-muted dark:text-dark-muted font-bold uppercase">Idempotency</p>
          <p className="text-sm font-black text-light-foreground dark:text-dark-foreground mt-0.5">SHA-256 Hashing</p>
        </div>
      </div>
    </section>
  );
};
